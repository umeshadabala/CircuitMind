import os
import shutil
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")
load_dotenv()

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "circuitmind.db"

def resolve_wokwi_cli(raw_path: str) -> str:
    cleaned = (raw_path or "").strip()
    if not cleaned:
        cleaned = "wokwi-cli"
    if os.path.isabs(cleaned) and os.path.exists(cleaned):
        return cleaned
    found = shutil.which(cleaned)
    if found:
        return found
    home = Path.home()
    for candidate in [
        home / "bin" / cleaned,
        home / ".wokwi" / "bin" / cleaned,
        home / ".local" / "bin" / cleaned
    ]:
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return cleaned

class Settings(BaseModel):
    app_name: str = "CircuitMind"
    version: str = "1.0.0"
    tagline: str = "Think it. Build it. Prove it."
    database_url: str = f"sqlite:///{DB_PATH}"
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama").strip()
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud").strip()
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "30.0"))
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
    wokwi_cli_path: str = resolve_wokwi_cli(os.getenv("WOKWI_CLI_PATH", "wokwi-cli"))
    wokwi_cli_token: str = os.getenv("WOKWI_CLI_TOKEN", "").strip()
    wokwi_timeout_seconds: int = int(os.getenv("WOKWI_TIMEOUT_SECONDS", "15"))

settings = Settings()

