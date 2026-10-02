from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "KisanAI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite:///./kisanai.db" # Defaulting to sqlite for dev, configurable via env
    
    # OTP
    OTP_MODE: str = "mock"
    OTP_PROVIDER: str = ""
    OTP_API_KEY: str = ""
    OTP_SENDER_ID: str = ""
    
    # Weather
    WEATHER_MODE: str = "mock"
    WEATHER_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
