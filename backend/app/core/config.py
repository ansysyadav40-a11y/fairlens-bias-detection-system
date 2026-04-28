from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./fallback.db"
    SECRET_KEY: str = "dev-secret"
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()