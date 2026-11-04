import json
import logging
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("circuitmind.ai.meta")


class MetaAIError(Exception):
    """Base exception for Meta Model API failures."""
    def __init__(self, message: str, status_code: Optional[int] = None, user_message: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.user_message = user_message or "Meta AI service request failed. Please check configuration."


class MetaAIConfigError(MetaAIError):
    """Raised when Meta AI credentials or model configurations are missing."""
    pass


class MetaAIAuthError(MetaAIError):
    """Raised when authentication (401/403) fails with Meta Model API."""
    pass


class MetaAIRateLimitError(MetaAIError):
    """Raised when rate limits (429) are encountered."""
    pass


class MetaAITimeoutError(MetaAIError):
    """Raised when Meta API request exceeds timeout."""
    pass


class MetaAIClient:
    """
    Client for the official Meta Model API (https://api.meta.ai/v1).
    Strict cost control:
    - Never exposes MODEL_API_KEY to caller or frontend.
    - Zero automatic retries on billable generation calls.
    - Strict maximum token output and prompt length enforcement.
    - Sanitized user-facing error messages without secret leakage.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model_id: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self._api_key = api_key
        self.base_url = (base_url or settings.META_API_BASE_URL).rstrip("/")
        self._model_id = model_id
        self.timeout = timeout or settings.META_API_TIMEOUT_SECONDS
        self.max_tokens = settings.META_MAX_OUTPUT_TOKENS

    @property
    def model_id(self) -> str:
        if self._model_id is not None:
            return self._model_id
        import os
        return os.getenv("META_MODEL_ID", settings.META_MODEL_ID)

    @property
    def api_key(self) -> str:
        if self._api_key is not None:
            return self._api_key
        import os
        return os.getenv("MODEL_API_KEY", settings.MODEL_API_KEY)

    def is_configured(self) -> bool:
        """Returns True if the backend has an API key configured for Meta AI."""
        return bool(self.api_key and self.api_key.strip())

    async def check_availability(self) -> Dict[str, Any]:
        """
        Non-billable health check validating Meta Model API connectivity and credentials.
        Queries /models without invoking token generation.
        Verifies that the designated model ID is supported by the configured endpoint.
        """
        if not self.is_configured():
            return {
                "status": "unconfigured",
                "configured": False,
                "model": self.model_id,
                "detail": "MODEL_API_KEY environment variable is not configured on the backend.",
            }

        url = f"{self.base_url}/models"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    available_models = [m.get("id") for m in data.get("data", []) if isinstance(m, dict)]
                    model_match = (self.model_id in available_models) if available_models else True
                    if available_models and not model_match:
                        logger.warning(
                            "Designated Meta model '%s' not found in available models: %s",
                            self.model_id,
                            available_models,
                        )
                    return {
                        "status": "connected" if model_match else "model_not_found",
                        "configured": True,
                        "model": self.model_id,
                        "model_verified": model_match,
                        "available_models": available_models[:10],
                        "detail": None if model_match else f"Model '{self.model_id}' is not in the endpoint's supported models list.",
                    }
                elif res.status_code in (401, 403):
                    return {
                        "status": "auth_failed",
                        "configured": True,
                        "model": self.model_id,
                        "detail": "Invalid or expired Meta Model API credentials.",
                    }
                elif res.status_code == 429:
                    return {
                        "status": "rate_limited",
                        "configured": True,
                        "model": self.model_id,
                        "detail": "Meta Model API rate limit reached.",
                    }
                else:
                    return {
                        "status": "error",
                        "configured": True,
                        "model": self.model_id,
                        "detail": f"Meta Model API returned HTTP {res.status_code}.",
                    }
        except httpx.TimeoutException:
            return {
                "status": "timeout",
                "configured": True,
                "model": self.model_id,
                "detail": "Connection to Meta Model API timed out.",
            }
        except Exception as e:
            return {
                "status": "network_error",
                "configured": True,
                "model": self.model_id,
                "detail": "Network error contacting Meta Model API endpoint.",
            }

    async def generate_chat_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """
        Invokes Meta Model API chat completion endpoint with strict cost limits and JSON extraction.
        Zero automatic retries to prevent unexpected billing.
        """
        if not self.is_configured():
            raise MetaAIConfigError(
                "Meta API key is not configured",
                status_code=503,
                user_message="Meta AI is currently unconfigured on the server. Please use Local AI (Ollama).",
            )

        # Enforce prompt length guardrails
        if len(prompt) > settings.META_MAX_PROMPT_CHARS:
            raise MetaAIError(
                f"Prompt exceeded maximum character limit ({len(prompt)} > {settings.META_MAX_PROMPT_CHARS})",
                status_code=400,
                user_message=f"Prompt exceeds character limit for Meta AI trial (max {settings.META_MAX_PROMPT_CHARS} characters).",
            )

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # System prompt instructions enforcing structured JSON output
        system_instruction = (
            f"{system_prompt}\n\n"
            "CRITICAL OUTPUT REQUIREMENT: Output pure, valid JSON ONLY matching the requested schema. "
            "Do NOT include markdown fences, prose, or extra text."
        )

        payload = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": self.max_tokens,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        try:
            # Single attempt — NO automatic retries to prevent unintended API expenditure
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)

                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise MetaAIError(
                            "Meta API response contained no choices",
                            status_code=502,
                            user_message="Meta AI returned an empty response.",
                        )
                    raw_content = choices[0].get("message", {}).get("content", "{}")
                    return self._parse_json(raw_content)

                elif res.status_code in (401, 403):
                    logger.error("Meta Model API authentication failed (HTTP %d)", res.status_code)
                    raise MetaAIAuthError(
                        f"Meta API Auth Failed: {res.status_code}",
                        status_code=res.status_code,
                        user_message="Meta Model API authentication failed. Server credentials need review.",
                    )

                elif res.status_code == 429:
                    logger.warning("Meta Model API rate limit exceeded (HTTP 429)")
                    raise MetaAIRateLimitError(
                        "Meta API rate limit exceeded",
                        status_code=429,
                        user_message="Meta AI rate limit exceeded. Please try again later or use Local AI.",
                    )

                elif res.status_code in (400, 404):
                    err_json = {}
                    try:
                        err_json = res.json()
                    except Exception:
                        pass
                    err_msg = err_json.get("error", {}).get("message", "") if isinstance(err_json, dict) else ""
                    detail = f": {err_msg}" if err_msg else ""
                    logger.error("Meta Model API rejected request (HTTP %d)%s", res.status_code, detail)
                    raise MetaAIError(
                        f"Meta API rejected model request (HTTP {res.status_code}){detail}",
                        status_code=res.status_code,
                        user_message=f"Meta Model '{self.model_id}' was rejected by the API (HTTP {res.status_code}){detail}. No silent substitution permitted.",
                    )

                elif res.status_code >= 500:
                    logger.error("Meta Model API server error: HTTP %d", res.status_code)
                    raise MetaAIError(
                        f"Meta API server error {res.status_code}",
                        status_code=502,
                        user_message=f"Meta Model API upstream error (HTTP {res.status_code}). Please try again later.",
                    )

                else:
                    logger.error("Meta Model API unexpected error: HTTP %d", res.status_code)
                    raise MetaAIError(
                        f"Meta API returned unexpected status {res.status_code}",
                        status_code=res.status_code,
                        user_message="Meta Model API encountered an unexpected error.",
                    )

        except httpx.TimeoutException as te:
            logger.warning("Meta Model API call timed out after %s seconds", self.timeout)
            raise MetaAITimeoutError(
                f"Meta API timed out after {self.timeout}s",
                status_code=504,
                user_message="Meta AI request timed out. The model did not respond within the time limit.",
            ) from te

        except httpx.ConnectError as ce:
            logger.error("Failed to connect to Meta Model API at %s: %s", url, ce)
            raise MetaAIError(
                f"Network connection to Meta API failed: {ce}",
                status_code=502,
                user_message="Could not connect to the Meta Model API network endpoint.",
            ) from ce

    @staticmethod
    def _parse_json(raw: str) -> Dict[str, Any]:
        """Safely parses structured JSON output, stripping any markdown wrappers if present."""
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()

        try:
            return json.loads(clean)
        except json.JSONDecodeError as err:
            logger.error("Meta API output was not valid JSON: %s", raw[:200])
            raise MetaAIError(
                f"Invalid JSON from Meta model: {err}",
                status_code=502,
                user_message="Meta AI returned a malformed response that could not be parsed into circuit data.",
            ) from err
