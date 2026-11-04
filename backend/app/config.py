import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Local Ollama Inference (Zero remote/paid AI calls)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60.0"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./circuitmind.db")

    # Meta AI Model API Configuration
    MODEL_API_KEY: str = os.getenv("MODEL_API_KEY", "")
    META_MODEL_ID: str = os.getenv("META_MODEL_ID", "muse-spark-1.3-contributor")
    META_API_BASE_URL: str = os.getenv("META_API_BASE_URL", "https://api.meta.ai/v1").rstrip("/")
    META_API_TIMEOUT_SECONDS: float = float(os.getenv("META_API_TIMEOUT_SECONDS", "30.0"))
    META_MAX_OUTPUT_TOKENS: int = int(os.getenv("META_MAX_OUTPUT_TOKENS", "1024"))
    META_MAX_PROMPT_CHARS: int = int(os.getenv("META_MAX_PROMPT_CHARS", "3000"))
    META_TRIAL_SECRET: str = os.getenv("META_TRIAL_SECRET", "circuitmind-meta-trial-hmac-secret-v1")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")


settings = Settings()
