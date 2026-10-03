import os
import json
import functools

try:
    import regex as re
except ImportError:
    import re  # stdlib fallback; Unicode category classes below won't work as well

# Byte-level BPE style pre-tokenization pattern (splits text into chunks that
# BPE merges are then applied to independently).
_PAT_STR = r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
try:
    _PAT = re.compile(_PAT_STR)
except Exception:
    # Simplified ASCII-only fallback if \p{L} etc. unsupported (stdlib re)
    _PAT = re.compile(r"""'s|'t|'re|'ve|'m|'ll|'d| ?[A-Za-z]+| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+""")


@functools.lru_cache()
def _bytes_to_unicode():
    """GPT-2's byte->unicode-char mapping so every byte value maps to a
    printable character (needed because BPE vocab files are stored as text)."""
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(ord("¡"), ord("¬") + 1)) + list(range(ord("®"), ord("ÿ") + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    cs = [chr(c) for c in cs]
    return dict(zip(bs, cs))


def _get_pairs(word):
    pairs = set()
    prev = word[0]
    for ch in word[1:]:
        pairs.add((prev, ch))
        prev = ch
    return pairs


class BPETokenizer:
    def __init__(self, vocab_path: str, merges_path: str, special_tokens: dict = None):
        with open(vocab_path, encoding="utf-8") as f:
            self.encoder = json.load(f)          # token string -> id
        self.decoder = {v: k for k, v in self.encoder.items()}

        with open(merges_path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        # first line is often a version header like "#version: 0.2"
        lines = [l for l in lines if l and not l.startswith("#")]
        merges = [tuple(l.split()) for l in lines]
        self.bpe_ranks = {pair: i for i, pair in enumerate(merges)}

        self.byte_encoder = _bytes_to_unicode()
        self.byte_decoder = {v: k for k, v in self.byte_encoder.items()}

        self.special_tokens = special_tokens or {}
        for tok, idx in self.special_tokens.items():
            self.encoder[tok] = idx
            self.decoder[idx] = tok

        self._cache = {}

    @classmethod
    def from_pretrained_dir(cls, weights_dir: str):
        vocab_path = os.path.join(weights_dir, "vocab.json")
        merges_path = os.path.join(weights_dir, "merges.txt")

        special_tokens = {}
        special_map_path = os.path.join(weights_dir, "tokenizer_config.json")
        if os.path.exists(special_map_path):
            with open(special_map_path, encoding="utf-8") as f:
                tok_cfg = json.load(f)
            added = tok_cfg.get("added_tokens_decoder", {})
            for idx_str, info in added.items():
                content = info.get("content") if isinstance(info, dict) else info
                if content:
                    special_tokens[content] = int(idx_str)

        return cls(vocab_path, merges_path, special_tokens)

    def _bpe(self, token: str) -> list:
        if token in self._cache:
            return self._cache[token]

        word = tuple(token)
        pairs = _get_pairs(word)
        if not pairs:
            return [token]

        while True:
            min_pair = min(pairs, key=lambda p: self.bpe_ranks.get(p, float("inf")))
            if min_pair not in self.bpe_ranks:
                break
            first, second = min_pair
            new_word = []
            i = 0
            while i < len(word):
                try:
                    j = word.index(first, i)
                    new_word.extend(word[i:j])
                    i = j
                except ValueError:
                    new_word.extend(word[i:])
                    break
                if i < len(word) - 1 and word[i] == first and word[i + 1] == second:
                    new_word.append(first + second)
                    i += 2
                else:
                    new_word.append(word[i])
                    i += 1
            word = tuple(new_word)
            if len(word) == 1:
                break
            pairs = _get_pairs(word)

        result = list(word)
        self._cache[token] = result
        return result

    def encode(self, text: str) -> list:
        # Handle special tokens by splitting around them first (simple approach:
        # only exact substring match, sufficient for tags like <|im_start|>).
        ids = []
        segments = [text]
        for tok in self.special_tokens:
            new_segments = []
            for seg in segments:
                if isinstance(seg, tuple):  # already a special-token marker
                    new_segments.append(seg)
                    continue
                parts = seg.split(tok)
                for k, part in enumerate(parts):
                    if part:
                        new_segments.append(part)
                    if k != len(parts) - 1:
                        new_segments.append((tok,))
            segments = new_segments

        for seg in segments:
            if isinstance(seg, tuple):
                ids.append(self.encoder[seg[0]])
                continue
            for chunk in re.findall(_PAT, seg):
                byte_encoded = "".join(self.byte_encoder[b] for b in chunk.encode("utf-8"))
                for bpe_token in self._bpe(byte_encoded):
                    ids.append(self.encoder[bpe_token])
        return ids

    def decode(self, ids: list) -> str:
        text_tokens = [self.decoder[i] for i in ids]
        text = "".join(text_tokens)
        byte_array = bytearray(self.byte_decoder.get(c, ord(c)) for c in text if c in self.byte_decoder)
        try:
            return byte_array.decode("utf-8", errors="replace")
        except Exception:
            return "".join(text_tokens)
