import json
import logging
from typing import Any, Dict, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("circuitmind.ai")


class OllamaUnavailableError(Exception):
    """Raised when the local Ollama server cannot be reached."""
    pass


class OllamaInferenceError(Exception):
    """Raised when Ollama inference fails or returns invalid structured output."""
    pass


class OllamaClient:
    """
    Dedicated local Ollama client.
    Ensures zero telemetry to remote/paid cloud providers.
    """

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self._model = model
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    @property
    def model(self) -> str:
        if self._model is not None:
            return self._model
        import os
        return os.getenv("OLLAMA_MODEL", settings.OLLAMA_MODEL)

    @model.setter
    def model(self, value: str):
        self._model = value

    async def check_health(self) -> Dict[str, Any]:
        """Checks connection to local Ollama and returns available local models."""
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    model_found = any(self.model in m for m in models) if self.model else True
                    return {
                        "status": "connected",
                        "base_url": self.base_url,
                        "configured_model": self.model,
                        "model_available": model_found,
                        "available_models": models,
                    }
                return {
                    "status": "error",
                    "base_url": self.base_url,
                    "detail": f"Ollama HTTP {res.status_code}",
                }
        except httpx.ConnectError:
            return {
                "status": "unavailable",
                "base_url": self.base_url,
                "detail": f"Cannot connect to Ollama at {self.base_url}. Ensure 'ollama serve' is running.",
            }
        except Exception as e:
            return {
                "status": "unavailable",
                "base_url": self.base_url,
                "detail": str(e),
            }

    async def generate_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """Requests structured JSON output from the local Ollama model."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise OllamaInferenceError(
                        f"Ollama returned HTTP {res.status_code}: {res.text}"
                    )
                data = res.json()
                raw_response = data.get("response", "{}")
                try:
                    return json.loads(raw_response)
                except json.JSONDecodeError as json_err:
                    # Attempt simple clean of markdown code fences if present
                    cleaned = raw_response.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                    try:
                        return json.loads(cleaned)
                    except Exception:
                        raise OllamaInferenceError(f"Ollama response was not valid JSON: {raw_response[:200]}") from json_err

        except (httpx.ConnectError, httpx.ConnectTimeout) as conn_err:
            raise OllamaUnavailableError(
                f"Local Ollama is unavailable at {self.base_url}. "
                f"Please start Ollama locally ('ollama serve') with model '{self.model}'."
            ) from conn_err
        except httpx.TimeoutException as timeout_err:
            raise OllamaInferenceError(
                f"Ollama inference timed out after {self.timeout} seconds. The local model may still be loading."
            ) from timeout_err
