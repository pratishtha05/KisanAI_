from __future__ import annotations

import contextlib
import io
import logging
import os
import threading
from typing import Iterator, Optional

import torch

from .paths import resolve_path
from .model import CausalLM
from .model_config import TransformerConfig
from .tokenizer import BPETokenizer
from .weight_loader import load_pretrained_model

log = logging.getLogger("kisanai.llm")

STOP_TOKENS = ("<|im_end|>", "<|endoftext|>")


def load_model(weights_dir: str, checkpoint: Optional[str] = None) -> CausalLM:
    """From a .pt checkpoint (see scripts/save_pt.py) or from the HF safetensors folder."""
    if checkpoint:
        ck = torch.load(checkpoint, map_location="cpu", weights_only=True)
        model = CausalLM(TransformerConfig(**ck["config"]))
        model.load_state_dict(ck["state_dict"])  # bf16 on disk -> fp32 in memory
        return model
    return load_pretrained_model(weights_dir)


def chat_prompt(user_message: str, system_message: str, shots=None) -> str:
    """ChatML template. `shots` = optional [(user, assistant), ...] example turns."""
    out = f"<|im_start|>system\n{system_message}<|im_end|>\n"
    for u, a in (shots or []):
        out += f"<|im_start|>user\n{u}<|im_end|>\n<|im_start|>assistant\n{a}<|im_end|>\n"
    return out + f"<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n"


class LLMEngine:
    def __init__(self, weights_dir: str, checkpoint: Optional[str] = None,
                 repo_id: str = "Qwen/Qwen2.5-0.5B-Instruct", size: str = "small"):
        self.weights_dir = resolve_path(weights_dir)
        self.checkpoint = checkpoint
        self.repo_id = repo_id
        self.size = size
        self.model = None
        self.tok: Optional[BPETokenizer] = None
        self.state = "idle"  # idle | loading | ready | error
        self.error: Optional[str] = None
        self._ready = threading.Event()
        self._load_lock = threading.Lock()
        self._gen_lock = threading.Lock()
        self._stop_ids: list[int] = []

    # ------------------------------------------------------------------ load
    def check_files(self) -> None:
        """Fail fast (and clearly) if the model files are not where .env says."""
        d = self.weights_dir
        tokenizer_ok = all(os.path.exists(os.path.join(d, f)) for f in ("vocab.json", "merges.txt"))
        download = (
            f"  python -c \"from huggingface_hub import snapshot_download; "
            f"snapshot_download('{self.repo_id}', local_dir='{d}')\""
        )
        if not tokenizer_ok:
            raise RuntimeError(
                f"Tokenizer files (vocab.json, merges.txt) not found in '{d}'. Download them with:\n{download}"
            )
        if self.checkpoint:
            if not os.path.isfile(self.checkpoint):
                raise RuntimeError(
                    f"Checkpoint '{self.checkpoint}' not found. Create it with:\n"
                    f"  python -m scripts.save_pt --size {self.size}"
                )
            return
        has_weights = os.path.isdir(d) and any(f.endswith(".safetensors") for f in os.listdir(d))
        if not has_weights or not os.path.exists(os.path.join(d, "config.json")):
            raise RuntimeError(f"Model weights not found in '{d}'. Download them with:\n{download}")

    def start_loading(self) -> None:
        """Kick off loading in a background thread (idempotent)."""
        with self._load_lock:
            if self.state in ("loading", "ready"):
                return
            self.state = "loading"
            self.error = None
        threading.Thread(target=self._load, name="llm-loader", daemon=True).start()

    def _load(self) -> None:
        try:
            log.info("Loading %s model from %s ...", self.size, self.checkpoint or self.weights_dir)
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                model = load_model(self.weights_dir, self.checkpoint)
                tok = BPETokenizer.from_pretrained_dir(self.weights_dir)
            for line in buf.getvalue().splitlines():
                (log.warning if "[WARN]" in line else log.info)("weight_loader: %s", line)

            model.eval()
            model.requires_grad_(False)  # inference only; no autograd graph, no no_grad() needed
            self.model, self.tok = model, tok
            self._stop_ids = [tok.encoder[t] for t in STOP_TOKENS if t in tok.encoder]
            self.state = "ready"
            self._ready.set()
            log.info("LLM ready.")
        except Exception as e:  # noqa: BLE001 - surfaced via /status and 503s
            self.state = "error"
            self.error = f"{type(e).__name__}: {e}"
            log.exception("LLM failed to load")

    def wait_ready(self, timeout: float = 300.0) -> bool:
        if self.state == "idle":
            self.start_loading()
        return self._ready.wait(timeout=timeout) and self.state == "ready"

    @property
    def ready(self) -> bool:
        return self.state == "ready"

    # -------------------------------------------------------------- generate
    def stream(
        self,
        user_message: str,
        system_message: str,
        shots=None,
        max_new_tokens: int = 220,
        temperature: float = 0.3,
        top_p: float = 0.9,
    ) -> Iterator[str]:
        """Yield the answer as text deltas. Holds the generation lock while
        running; if the consumer stops iterating the lock is released."""
        if not self.ready:
            raise RuntimeError("LLM is not loaded")

        model, tok = self.model, self.tok
        prompt = chat_prompt(user_message, system_message, shots)
        input_ids = torch.tensor([tok.encode(prompt)])
        prompt_len = input_ids.shape[1]

        with self._gen_lock:
            kv_caches = [(None, None)] * model.config.num_hidden_layers
            logits, kv_caches = model(input_ids, kv_caches=kv_caches, start_pos=0)
            next_token = model._sample(logits[:, -1, :], temperature, top_p)

            out_ids: list[int] = []
            emitted = ""

            for step in range(max_new_tokens):
                tid = int(next_token.item())
                if tid in self._stop_ids:
                    break
                out_ids.append(tid)

                text = tok.decode(out_ids)
                # trailing U+FFFD = multi-byte character still incomplete -> wait for more tokens
                if not text.endswith("\ufffd"):
                    delta = text[len(emitted):]
                    if delta:
                        emitted = text
                        yield delta

                if step == max_new_tokens - 1:
                    break
                logits, kv_caches = model(
                    next_token, kv_caches=kv_caches, start_pos=prompt_len + len(out_ids) - 1
                )
                next_token = model._sample(logits[:, -1, :], temperature, top_p)

            final = tok.decode(out_ids)
            if len(final) > len(emitted):
                yield final[len(emitted):]


_engine: Optional[LLMEngine] = None


def get_engine() -> LLMEngine:
    """Engine for the model chosen by LLM_MODEL / LLM_USE_PT in .env."""
    global _engine
    if _engine is None:
        from .paths import selected_model
        size, weights_dir, checkpoint, repo = selected_model()
        _engine = LLMEngine(weights_dir, checkpoint=checkpoint, repo_id=repo, size=size)
    return _engine