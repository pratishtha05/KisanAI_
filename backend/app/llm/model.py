"""
Decoder-only transformer, implemented from scratch.
Implements a modern decoder-only architecture:

  - RMSNorm (pre-norm, applied before attention and before MLP)
  - Rotary position embeddings (RoPE) applied to Q and K
  - Grouped-Query Attention (fewer K/V heads than Q heads, each KV head
    shared across a group of Q heads)
  - Q/K/V projections have bias, output projection does not
  - SwiGLU-gated MLP (gate_proj, up_proj, down_proj)
  - Causal masking
  - Tied input/output embeddings (for the small variants)
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F

from .model_config import TransformerConfig


class RMSNorm(nn.Module):
    """Root-mean-square layer norm (no mean-centering, no bias)."""

    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Compute in float32 for numerical stability, cast back after.
        input_dtype = x.dtype
        x = x.to(torch.float32)
        variance = x.pow(2).mean(dim=-1, keepdim=True)
        x = x * torch.rsqrt(variance + self.eps)
        return (self.weight * x.to(input_dtype))


def precompute_rope(head_dim: int, max_positions: int, theta: float, device=None, dtype=torch.float32):
    """Precompute cos/sin tables for rotary embeddings.

    Returns cos, sin of shape (max_positions, head_dim).
    """
    inv_freq = 1.0 / (theta ** (torch.arange(0, head_dim, 2, dtype=torch.float32, device=device) / head_dim))
    positions = torch.arange(max_positions, dtype=torch.float32, device=device)
    freqs = torch.outer(positions, inv_freq)          # (max_positions, head_dim/2)
    emb = torch.cat([freqs, freqs], dim=-1)             # (max_positions, head_dim)
    return emb.cos().to(dtype), emb.sin().to(dtype)


def rotate_half(x: torch.Tensor) -> torch.Tensor:
    """Rotates half the hidden dims of the input (standard RoPE trick)."""
    x1 = x[..., : x.shape[-1] // 2]
    x2 = x[..., x.shape[-1] // 2:]
    return torch.cat((-x2, x1), dim=-1)


def apply_rope(q: torch.Tensor, k: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor):
    """q, k: (batch, num_heads, seq_len, head_dim)
    cos, sin: (seq_len, head_dim) -> broadcast to (1, 1, seq_len, head_dim)
    """
    cos = cos.unsqueeze(0).unsqueeze(0)
    sin = sin.unsqueeze(0).unsqueeze(0)
    q_rot = (q * cos) + (rotate_half(q) * sin)
    k_rot = (k * cos) + (rotate_half(k) * sin)
    return q_rot, k_rot


def repeat_kv(x: torch.Tensor, n_rep: int) -> torch.Tensor:
    """Expand KV heads to match number of Q heads for GQA.
    x: (batch, num_kv_heads, seq_len, head_dim) -> (batch, num_kv_heads*n_rep, seq_len, head_dim)
    """
    if n_rep == 1:
        return x
    batch, num_kv_heads, seq_len, head_dim = x.shape
    x = x[:, :, None, :, :].expand(batch, num_kv_heads, n_rep, seq_len, head_dim)
    return x.reshape(batch, num_kv_heads * n_rep, seq_len, head_dim)


class GQAAttention(nn.Module):
    def __init__(self, config: TransformerConfig):
        super().__init__()
        self.hidden_size = config.hidden_size
        self.num_heads = config.num_attention_heads
        self.num_kv_heads = config.num_key_value_heads
        self.head_dim = config.head_dim
        self.n_rep = self.num_heads // self.num_kv_heads

        bias = config.attention_bias
        self.q_proj = nn.Linear(self.hidden_size, self.num_heads * self.head_dim, bias=bias)
        self.k_proj = nn.Linear(self.hidden_size, self.num_kv_heads * self.head_dim, bias=bias)
        self.v_proj = nn.Linear(self.hidden_size, self.num_kv_heads * self.head_dim, bias=bias)
        self.o_proj = nn.Linear(self.num_heads * self.head_dim, self.hidden_size, bias=False)

    def forward(self, x, cos, sin, attn_mask, kv_cache=None):
        batch, seq_len, _ = x.shape

        q = self.q_proj(x).view(batch, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch, seq_len, self.num_kv_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch, seq_len, self.num_kv_heads, self.head_dim).transpose(1, 2)

        q, k = apply_rope(q, k, cos, sin)

        if kv_cache is not None:
            past_k, past_v = kv_cache
            if past_k is not None:
                k = torch.cat([past_k, k], dim=2)
                v = torch.cat([past_v, v], dim=2)
            new_cache = (k, v)
        else:
            new_cache = None

        k = repeat_kv(k, self.n_rep)
        v = repeat_kv(v, self.n_rep)

        attn_scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        if attn_mask is not None:
            attn_scores = attn_scores + attn_mask
        attn_probs = F.softmax(attn_scores, dim=-1, dtype=torch.float32).to(q.dtype)

        out = torch.matmul(attn_probs, v)                     # (batch, heads, seq_len, head_dim)
        out = out.transpose(1, 2).contiguous().view(batch, seq_len, self.num_heads * self.head_dim)
        out = self.o_proj(out)
        return out, new_cache


class SwiGLUMLP(nn.Module):
    """SwiGLU-gated MLP: down( silu(gate(x)) * up(x) )"""

    def __init__(self, config: TransformerConfig):
        super().__init__()
        self.gate_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
        self.up_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
        self.down_proj = nn.Linear(config.intermediate_size, config.hidden_size, bias=False)

    def forward(self, x):
        return self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x))


class DecoderLayer(nn.Module):
    def __init__(self, config: TransformerConfig):
        super().__init__()
        self.input_layernorm = RMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        self.self_attn = GQAAttention(config)
        self.post_attention_layernorm = RMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        self.mlp = SwiGLUMLP(config)

    def forward(self, x, cos, sin, attn_mask, kv_cache=None):
        residual = x
        h = self.input_layernorm(x)
        attn_out, new_cache = self.self_attn(h, cos, sin, attn_mask, kv_cache)
        x = residual + attn_out

        residual = x
        h = self.post_attention_layernorm(x)
        mlp_out = self.mlp(h)
        x = residual + mlp_out
        return x, new_cache


class TransformerBackbone(nn.Module):
    """The transformer backbone (embeddings + decoder layers + final norm)."""

    def __init__(self, config: TransformerConfig):
        super().__init__()
        self.config = config
        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
        self.layers = nn.ModuleList([DecoderLayer(config) for _ in range(config.num_hidden_layers)])
        self.norm = RMSNorm(config.hidden_size, eps=config.rms_norm_eps)

        cos, sin = precompute_rope(
            config.head_dim, config.max_position_embeddings, config.rope_theta
        )
        self.register_buffer("rope_cos", cos, persistent=False)
        self.register_buffer("rope_sin", sin, persistent=False)

    def forward(self, input_ids, kv_caches=None, start_pos=0):
        batch, seq_len = input_ids.shape
        x = self.embed_tokens(input_ids)

        cos = self.rope_cos[start_pos:start_pos + seq_len].to(x.dtype)
        sin = self.rope_sin[start_pos:start_pos + seq_len].to(x.dtype)

        # Causal mask. When using a KV cache, the new queries (seq_len) can
        # attend to all cached + new keys (start_pos + seq_len), but still
        # only causally among the new tokens.
        total_len = start_pos + seq_len
        mask = torch.full((seq_len, total_len), float("-inf"), device=x.device)
        mask = torch.triu(mask, diagonal=1 + start_pos)
        mask = mask.unsqueeze(0).unsqueeze(0)  # (1, 1, seq_len, total_len)

        new_caches = []
        for i, layer in enumerate(self.layers):
            cache = kv_caches[i] if kv_caches is not None else None
            x, new_cache = layer(x, cos, sin, mask, cache)
            new_caches.append(new_cache)

        x = self.norm(x)
        return x, new_caches


class CausalLM(nn.Module):
    def __init__(self, config: TransformerConfig):
        super().__init__()
        self.config = config
        self.model = TransformerBackbone(config)
        if config.tie_word_embeddings:
            self.lm_head = None  # will reuse embed_tokens.weight in forward
        else:
            self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)

    def forward(self, input_ids, kv_caches=None, start_pos=0):
        hidden, new_caches = self.model(input_ids, kv_caches, start_pos)
        if self.config.tie_word_embeddings:
            logits = F.linear(hidden, self.model.embed_tokens.weight)
        else:
            logits = self.lm_head(hidden)
        return logits, new_caches

    @torch.no_grad()
    def generate(self, input_ids, max_new_tokens=50, temperature=0.7, top_p=0.9, eos_token_id=None):
        """Simple autoregressive generation with KV caching, temperature + nucleus sampling."""
        self.eval()
        device = input_ids.device
        batch = input_ids.shape[0]
        kv_caches = [(None, None)] * self.config.num_hidden_layers
        generated = input_ids

        logits, kv_caches = self.forward(input_ids, kv_caches=kv_caches, start_pos=0)
        next_token = self._sample(logits[:, -1, :], temperature, top_p)
        generated = torch.cat([generated, next_token], dim=1)

        for step in range(max_new_tokens - 1):
            start_pos = generated.shape[1] - 1
            logits, kv_caches = self.forward(next_token, kv_caches=kv_caches, start_pos=start_pos)
            next_token = self._sample(logits[:, -1, :], temperature, top_p)
            generated = torch.cat([generated, next_token], dim=1)
            if eos_token_id is not None and (next_token == eos_token_id).all():
                break

        return generated

    @staticmethod
    def _sample(logits, temperature, top_p):
        if temperature == 0:
            return torch.argmax(logits, dim=-1, keepdim=True)
        logits = logits / temperature
        probs = F.softmax(logits, dim=-1)
        sorted_probs, sorted_idx = torch.sort(probs, descending=True, dim=-1)
        cum_probs = torch.cumsum(sorted_probs, dim=-1)
        cutoff = cum_probs > top_p
        cutoff[..., 1:] = cutoff[..., :-1].clone()
        cutoff[..., 0] = False
        sorted_probs[cutoff] = 0.0
        sorted_probs = sorted_probs / sorted_probs.sum(dim=-1, keepdim=True)
        sampled = torch.multinomial(sorted_probs, num_samples=1)
        return torch.gather(sorted_idx, -1, sampled)
