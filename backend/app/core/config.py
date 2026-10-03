from pydantic_settings import BaseSettings

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "KisanAI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite:///./kisanai.db"

    # OTP
    OTP_MODE: str = "mock"
    OTP_PROVIDER: str = ""
    OTP_API_KEY: str = ""
    OTP_SENDER_ID: str = ""

    # Weather
    WEATHER_MODE: str = "mock"
    WEATHER_API_KEY: str = ""

    # --- Farm advisor LLM ---
    LLM_MODE: str = "mock"                     # "mock" | "local"
    LLM_MODEL: str = "small"                   # "small" = 0.5B | "medium" = 1.5B
    LLM_WEIGHTS_DIR_SMALL: str = "./model_weights"
    LLM_WEIGHTS_DIR_MEDIUM: str = "./model_weights_1.5b"
    LLM_USE_PT: bool = False
    LLM_CHECKPOINT_DIR: str = "./checkpoints"
    LLM_WEIGHTS_DIR: str = ""                  # optional override
    LLM_PRELOAD: bool = True
    LLM_LOAD_TIMEOUT: float = 300.0
    LLM_MAX_NEW_TOKENS: int = 220
    LLM_TEMPERATURE: float = 0.3
    LLM_TOP_P: float = 0.9

    # --- Knowledge base (ChromaDB) ---
    RAG_PERSIST_DIR: str = "./chroma_db"
    RAG_COLLECTION: str = "rag_docs"
    RAG_TOP_K: int = 3
    RAG_MIN_SIMILARITY: float = 0.25

    class Config:
        env_file = ".env"
        extra = "ignore"      
settings = Settings()