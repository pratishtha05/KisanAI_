import os
import json
import glob
import torch
from safetensors.torch import safe_open

from .model_config import TransformerConfig
from .model import CausalLM


def build_key_mapping(num_layers: int, tie_word_embeddings: bool):
    """Maps HF checkpoint key -> our model's state_dict key.

    HF CausalLM keys look like:
        model.embed_tokens.weight
        model.layers.{i}.self_attn.q_proj.weight / .bias
        model.layers.{i}.self_attn.k_proj.weight / .bias
        model.layers.{i}.self_attn.v_proj.weight / .bias
        model.layers.{i}.self_attn.o_proj.weight
        model.layers.{i}.mlp.gate_proj.weight
        model.layers.{i}.mlp.up_proj.weight
        model.layers.{i}.mlp.down_proj.weight
        model.layers.{i}.input_layernorm.weight
        model.layers.{i}.post_attention_layernorm.weight
        model.norm.weight
        lm_head.weight                      (absent if tied)
    """
    mapping = {
        "model.embed_tokens.weight": "model.embed_tokens.weight",
        "model.norm.weight": "model.norm.weight",
    }
    for i in range(num_layers):
        prefix_hf = f"model.layers.{i}"
        prefix_us = f"model.layers.{i}"
        for name in [
            "self_attn.q_proj.weight", "self_attn.q_proj.bias",
            "self_attn.k_proj.weight", "self_attn.k_proj.bias",
            "self_attn.v_proj.weight", "self_attn.v_proj.bias",
            "self_attn.o_proj.weight",
            "mlp.gate_proj.weight", "mlp.up_proj.weight", "mlp.down_proj.weight",
            "input_layernorm.weight", "post_attention_layernorm.weight",
        ]:
            mapping[f"{prefix_hf}.{name}"] = f"{prefix_us}.{name}"

    if not tie_word_embeddings:
        mapping["lm_head.weight"] = "lm_head.weight"

    return mapping


def _load_all_safetensors(weights_dir: str) -> dict:
    """Reads every .safetensors shard in weights_dir into one state dict."""
    shard_paths = sorted(glob.glob(os.path.join(weights_dir, "*.safetensors")))
    if not shard_paths:
        raise FileNotFoundError(f"No .safetensors files found in {weights_dir}")

    state_dict = {}
    for path in shard_paths:
        with safe_open(path, framework="pt", device="cpu") as f:
            for key in f.keys():
                state_dict[key] = f.get_tensor(key)
    return state_dict


def load_from_pytorch_bin(weights_dir: str) -> dict:
    """Alternative loader if the repo only has pytorch_model.bin shards."""
    bin_paths = sorted(glob.glob(os.path.join(weights_dir, "pytorch_model*.bin")))
    if not bin_paths:
        raise FileNotFoundError(f"No pytorch_model*.bin files found in {weights_dir}")
    state_dict = {}
    for path in bin_paths:
        shard = torch.load(path, map_location="cpu")
        state_dict.update(shard)
    return state_dict


def load_config_from_json(weights_dir: str) -> TransformerConfig:
    """Reads config.json (plain JSON, not HF code) and builds our TransformerConfig."""
    with open(os.path.join(weights_dir, "config.json")) as f:
        raw = json.load(f)

    return TransformerConfig(
        vocab_size=raw["vocab_size"],
        hidden_size=raw["hidden_size"],
        intermediate_size=raw["intermediate_size"],
        num_hidden_layers=raw["num_hidden_layers"],
        num_attention_heads=raw["num_attention_heads"],
        num_key_value_heads=raw.get("num_key_value_heads", raw["num_attention_heads"]),
        max_position_embeddings=raw.get("max_position_embeddings", 32768),
        rope_theta=raw.get("rope_theta", 1_000_000.0),
        rms_norm_eps=raw.get("rms_norm_eps", 1e-6),
        tie_word_embeddings=raw.get("tie_word_embeddings", True),
        attention_bias=raw.get("attention_bias", True) if "attention_bias" in raw else True,
    )


def load_pretrained_model(weights_dir: str, device: str = "cpu", dtype=torch.float32) -> CausalLM:
    """Full pipeline: read config.json -> build model -> load safetensors -> strict shape check."""
    config = load_config_from_json(weights_dir)
    model = CausalLM(config)

    try:
        hf_state = _load_all_safetensors(weights_dir)
    except FileNotFoundError:
        hf_state = load_from_pytorch_bin(weights_dir)

    mapping = build_key_mapping(config.num_hidden_layers, config.tie_word_embeddings)

    our_state = model.state_dict()
    new_state = {}
    missing = []
    shape_mismatches = []

    for hf_key, our_key in mapping.items():
        if hf_key not in hf_state:
            missing.append(hf_key)
            continue
        tensor = hf_state[hf_key]
        if our_key in our_state and our_state[our_key].shape != tensor.shape:
            shape_mismatches.append((hf_key, tensor.shape, our_state[our_key].shape))
            continue
        new_state[our_key] = tensor.to(dtype)

    unused_hf_keys = set(hf_state.keys()) - set(mapping.keys())
    # rotary embedding buffers on our side aren't in the HF checkpoint at all -- expected.
    unloaded_our_keys = set(our_state.keys()) - set(new_state.keys()) - {"model.rope_cos", "model.rope_sin"}

    if missing:
        print(f"[WARN] {len(missing)} expected HF keys not found in checkpoint (first 5): {missing[:5]}")
    if shape_mismatches:
        print(f"[WARN] {len(shape_mismatches)} shape mismatches (first 5): {shape_mismatches[:5]}")
    if unused_hf_keys:
        print(f"[INFO] {len(unused_hf_keys)} HF keys not used (first 5): {sorted(unused_hf_keys)[:5]}")
    if unloaded_our_keys:
        print(f"[WARN] {len(unloaded_our_keys)} of our params were NOT filled by checkpoint: {sorted(unloaded_our_keys)[:5]}")

    result = model.load_state_dict(new_state, strict=False)
    if result.missing_keys:
        real_missing = [k for k in result.missing_keys if k not in ("model.rope_cos", "model.rope_sin")]
        if real_missing:
            print(f"[WARN] load_state_dict missing_keys: {real_missing[:10]}")
    if result.unexpected_keys:
        print(f"[WARN] load_state_dict unexpected_keys: {result.unexpected_keys[:10]}")

    model.to(device)
    model.eval()
    print(f"Loaded checkpoint from {weights_dir}: "
          f"{sum(p.numel() for p in model.parameters()):,} params, "
          f"{len(new_state)}/{len(mapping)} tensors matched.")
    return model


if __name__ == "__main__":
    import sys
    weights_dir = sys.argv[1] if len(sys.argv) > 1 else "./model_weights"
    model = load_pretrained_model(weights_dir)
