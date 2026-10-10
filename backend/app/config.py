import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "circuitmind.db"

class Settings(BaseModel):
    app_name: str = "CircuitMind"
    version: str = "1.0.0"
    tagline: str = "Think it. Build it. Prove it."
    database_url: str = f"sqlite:///{DB_PATH}"
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    wokwi_cli_token: str = os.getenv("WOKWI_CLI_TOKEN", "")

settings = Settings()
