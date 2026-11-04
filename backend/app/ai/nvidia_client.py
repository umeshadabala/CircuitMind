import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
import openai
from openai import AsyncOpenAI
from backend.app.config import settings

logger = logging.getLogger("circuitmind.ai.nvidia")


class NVIDIAAIError(Exception):
    """Base exception for NVIDIA NIM failures."""
    def __init__(self, message: str, status_code: Optional[int] = None, user_message: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code or 502
        self.user_message = user_message or "NVIDIA NIM service request failed. Please check configuration."


class NVIDIAAIConfigError(NVIDIAAIError):
    """Raised when NVIDIA credentials or model configurations are missing."""
    pass


class NVIDIAAIAuthError(NVIDIAAIError):
    """Raised when authentication (401/403) fails with NVIDIA NIM."""
    pass


class NVIDIAAIRateLimitError(NVIDIAAIError):
    """Raised when rate limits (429) are encountered."""
    pass


class NVIDIAAITimeoutError(NVIDIAAIError):
    """Raised when NVIDIA NIM API request exceeds timeout."""
    pass


class NVIDIAClient:
    """
    Dedicated client for NVIDIA NIM OpenAI-compatible API (https://integrate.api.nvidia.com/v1).
    Serves Meta's Muse Glimmer 30B model (meta/muse-glimmer-30b).

    Strict constraints:
    - Zero automatic retries on billable generation requests (max_retries=0).
    - Never silently substitutes an alternate model.
    - Credentials remain strictly server-side (NVIDIA_API_KEY).
    - Enforces maximum output tokens and prompt length boundaries.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model_id: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self._api_key = api_key
        self._base_url = base_url
        self._model_id = model_id
        self._timeout = timeout

    @property
    def api_key(self) -> str:
        if self._api_key is not None:
            return self._api_key
        return os.getenv("NVIDIA_API_KEY", settings.NVIDIA_API_KEY)

    @api_key.setter
    def api_key(self, value: Optional[str]):
        self._api_key = value

    @property
    def base_url(self) -> str:
        if self._base_url is not None:
            return self._base_url.rstrip("/")
        return os.getenv("NVIDIA_BASE_URL", settings.NVIDIA_BASE_URL).rstrip("/")

    @property
    def model_id(self) -> str:
        if self._model_id is not None:
            return self._model_id
        return os.getenv("NVIDIA_MODEL", settings.NVIDIA_MODEL)

    @model_id.setter
    def model_id(self, value: Optional[str]):
        self._model_id = value

    @property
    def timeout(self) -> float:
        if self._timeout is not None:
            return self._timeout
        return settings.NVIDIA_TIMEOUT_SECONDS

    @property
    def max_tokens(self) -> int:
        return settings.NVIDIA_MAX_OUTPUT_TOKENS

    @property
    def max_chars(self) -> int:
        return settings.NVIDIA_MAX_PROMPT_CHARS

    def is_configured(self) -> bool:
        """Returns True if the backend has an API key configured for NVIDIA NIM."""
        return bool(self.api_key and self.api_key.strip())

    def _get_client(self) -> AsyncOpenAI:
        """Initializes AsyncOpenAI client configured for NVIDIA NIM endpoint."""
        return AsyncOpenAI(
            base_url=self.base_url,
            api_key=self.api_key or "missing_key",
            timeout=self.timeout,
            max_retries=0,  # Strict: no automatic retries on billable requests
        )

    async def check_availability(self) -> Dict[str, Any]:
        """
        Non-billable health check validating NVIDIA NIM connectivity and credentials.
        Lists models without invoking token generation.
        Verifies that the designated model ID is supported by the configured endpoint.
        """
        if not self.is_configured():
            return {
                "status": "unconfigured",
                "configured": False,
                "model": self.model_id,
                "detail": "NVIDIA_API_KEY environment variable is not configured on the backend.",
            }

        client = self._get_client()
        try:
            models_response = await client.models.list()
            available_models: List[str] = [m.id for m in models_response.data] if hasattr(models_response, "data") else []
            model_match = (self.model_id in available_models) if available_models else True

            if available_models and not model_match:
                logger.warning(
                    "Designated NVIDIA model '%s' not found in available models: %s",
                    self.model_id,
                    available_models[:10],
                )

            return {
                "status": "connected" if model_match else "model_not_found",
                "configured": True,
                "model": self.model_id,
                "model_verified": model_match,
                "available_models": available_models[:10],
                "detail": None if model_match else f"Model '{self.model_id}' is not in NVIDIA NIM available models list.",
            }

        except (openai.AuthenticationError, openai.PermissionDeniedError) as auth_err:
            logger.error("NVIDIA NIM authentication failed: %s", auth_err)
            return {
                "status": "auth_failed",
                "configured": True,
                "model": self.model_id,
                "detail": "Invalid or expired NVIDIA NIM API credentials.",
            }
        except openai.RateLimitError as rle:
            logger.warning("NVIDIA NIM rate limited on check: %s", rle)
            return {
                "status": "rate_limited",
                "configured": True,
                "model": self.model_id,
                "detail": "NVIDIA NIM API rate limit reached.",
            }
        except openai.APITimeoutError:
            return {
                "status": "timeout",
                "configured": True,
                "model": self.model_id,
                "detail": "Connection to NVIDIA NIM API timed out.",
            }
        except openai.APIConnectionError as ace:
            logger.error("NVIDIA NIM network error: %s", ace)
            return {
                "status": "network_error",
                "configured": True,
                "model": self.model_id,
                "detail": "Network error contacting NVIDIA NIM endpoint.",
            }
        except Exception as e:
            logger.error("NVIDIA NIM unexpected health check error: %s", e)
            return {
                "status": "error",
                "configured": True,
                "model": self.model_id,
                "detail": f"NVIDIA NIM error: {str(e)}",
            }

    async def generate_chat_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """
        Executes a single, non-retried JSON chat completion against NVIDIA NIM
        using the official OpenAI Python SDK.
        """
        if not self.is_configured():
            raise NVIDIAAIConfigError(
                "NVIDIA API key is not configured",
                status_code=500,
                user_message="NVIDIA NIM API key is not configured on the backend.",
            )

        if len(prompt) > self.max_chars:
            raise NVIDIAAIError(
                f"Prompt exceeds {self.max_chars} chars",
                status_code=400,
                user_message=f"Prompt exceeds character limit for NVIDIA NIM trial (max {self.max_chars} characters).",
            )

        system_instruction = (
            f"{system_prompt}\n\n"
            "CRITICAL OUTPUT REQUIREMENT: Output pure, valid JSON ONLY matching the requested schema. "
            "Do NOT include markdown fences, prose, or extra text."
        )

        client = self._get_client()

        try:
            response = await client.chat.completions.create(
                model=self.model_id,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=self.max_tokens,
            )

            choices = response.choices if hasattr(response, "choices") else []
            if not choices:
                raise NVIDIAAIError(
                    "NVIDIA NIM response contained no choices",
                    status_code=502,
                    user_message="NVIDIA NIM returned an empty response.",
                )

            raw_content = choices[0].message.content or "{}"
            return self._parse_json(raw_content)

        except (openai.AuthenticationError, openai.PermissionDeniedError) as auth_err:
            logger.error("NVIDIA NIM authentication failure: %s", auth_err)
            raise NVIDIAAIAuthError(
                f"NVIDIA NIM auth failure: {auth_err}",
                status_code=401,
                user_message="NVIDIA NIM authentication failed. Please verify NVIDIA_API_KEY credentials.",
            ) from auth_err

        except openai.RateLimitError as rle:
            logger.warning("NVIDIA NIM rate limit exceeded: %s", rle)
            raise NVIDIAAIRateLimitError(
                f"NVIDIA NIM rate limit: {rle}",
                status_code=429,
                user_message="NVIDIA NIM rate limit exceeded. Please try again later or switch to Local AI.",
            ) from rle

        except (openai.NotFoundError, openai.BadRequestError) as bad_req:
            logger.error("NVIDIA NIM bad request: %s", bad_req)
            raise NVIDIAAIError(
                f"NVIDIA NIM rejected request: {bad_req}",
                status_code=400,
                user_message=f"NVIDIA NIM rejected model request for '{self.model_id}'. No silent substitution permitted.",
            ) from bad_req

        except openai.APITimeoutError as timeout_err:
            logger.warning("NVIDIA NIM request timed out after %s seconds", self.timeout)
            raise NVIDIAAITimeoutError(
                f"NVIDIA NIM timed out after {self.timeout}s",
                status_code=504,
                user_message="NVIDIA NIM request timed out. The model did not respond within the time limit.",
            ) from timeout_err

        except openai.APIConnectionError as conn_err:
            logger.error("Failed to connect to NVIDIA NIM endpoint at %s: %s", self.base_url, conn_err)
            raise NVIDIAAIError(
                f"Network connection to NVIDIA NIM failed: {conn_err}",
                status_code=502,
                user_message="Could not connect to the NVIDIA NIM API network endpoint.",
            ) from conn_err

        except openai.APIError as api_err:
            logger.error("NVIDIA NIM API error: %s", api_err)
            raise NVIDIAAIError(
                f"NVIDIA NIM error: {api_err}",
                status_code=502,
                user_message=f"NVIDIA NIM upstream error: {getattr(api_err, 'message', str(api_err))}",
            ) from api_err

    def _parse_json(self, raw_content: str) -> Dict[str, Any]:
        """Safely parses JSON payload from response text."""
        cleaned = raw_content.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
            return {"message": str(parsed), "actions": []}
        except json.JSONDecodeError as jde:
            logger.warning("Failed to parse strict JSON from NVIDIA response: %s", jde)
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
            return {"message": cleaned, "actions": []}

