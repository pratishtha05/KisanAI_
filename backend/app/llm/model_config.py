
from dataclasses import dataclass

@dataclass
class TransformerConfig:
    vocab_size: int = 151936
    hidden_size: int = 896
    intermediate_size: int = 4864
    num_hidden_layers: int = 24
    num_attention_heads: int = 14
    num_key_value_heads: int = 2       # GQA: fewer KV heads than Q heads
    head_dim: int = None                # derived if None
    max_position_embeddings: int = 32768
    rope_theta: float = 1_000_000.0
    rms_norm_eps: float = 1e-6
    tie_word_embeddings: bool = True
    attention_bias: bool = True         
    dtype: str = "float32"

    def __post_init__(self):
        if self.head_dim is None:
            self.head_dim = self.hidden_size // self.num_attention_heads



CONFIG_SMALL = TransformerConfig(
    vocab_size=151936,
    hidden_size=896,
    intermediate_size=4864,
    num_hidden_layers=24,
    num_attention_heads=14,
    num_key_value_heads=2,
    max_position_embeddings=32768,
    rope_theta=1_000_000.0,
    tie_word_embeddings=True,
)

CONFIG_MEDIUM = TransformerConfig(
    vocab_size=151936,
    hidden_size=1536,
    intermediate_size=8960,
    num_hidden_layers=28,
    num_attention_heads=12,
    num_key_value_heads=2,
    max_position_embeddings=32768,
    rope_theta=1_000_000.0,
    tie_word_embeddings=True,
)
