import asyncio
import base64
import hashlib
import hmac
import logging
import secrets
import time
from typing import Dict, Optional, Set, Tuple
from fastapi import Request, Response
from backend.app.config import settings

logger = logging.getLogger("circuitmind.ai.trial")

COOKIE_NAME = "cm_meta_trial"
COOKIE_MAX_AGE = 90 * 24 * 3600  # 90 days in seconds
IP_RATE_LIMIT_WINDOW = 60  # seconds
IP_RATE_LIMIT_MAX_ATTEMPTS = 5


class TrialPolicyError(Exception):
    """Raised when trial validation or consumption fails."""
    def __init__(self, message: str, status_code: int = 403, state: str = "unavailable"):
        super().__init__(message)
        self.status_code = status_code
        self.state = state


class MetaTrialManager:
    """
    Stateless, cryptographic HMAC-signed cookie manager enforcing CircuitMind's
    strict One-Trial Policy for the Meta Model API without a database.

    Trial States:
    - 'available': Valid unconsumed trial token.
    - 'processing': In-flight request currently executing.
    - 'consumed': Trial token has been expended.
    - 'unavailable': Invalid, tampered, expired, or depleted token.

    Abuse Mitigations (Stateless Architecture):
    1. HMAC-SHA256 signature verification over (token_id:state:timestamp:nonce).
    2. In-process atomic concurrency lock preventing simultaneous double-spending.
    3. Ephemeral keyed-hash IP rate limiter to mitigate rapid cookie-clearing spam.
    4. Strict HttpOnly, SameSite=Lax flags to prevent client-side JavaScript tampering.
    """

    def __init__(self, secret_key: Optional[str] = None):
        self.secret = (secret_key or settings.META_TRIAL_SECRET).encode("utf-8")
        # In-process concurrency registry to prevent parallel requests on same token
        self._active_tokens: Set[str] = set()
        self._lock = asyncio.Lock()
        # In-memory ephemeral IP rate limit tracking (keyed hash -> list of timestamps)
        self._ip_history: Dict[str, list] = {}

    def _sign(self, data_str: str) -> str:
        """Computes HMAC-SHA256 signature for data string."""
        return hmac.new(self.secret, data_str.encode("utf-8"), hashlib.sha256).hexdigest()

    def create_token_payload(self, state: str = "available", token_id: Optional[str] = None) -> str:
        """
        Creates a signed token: {token_id}:{state}:{issued_at}:{nonce}:{signature}
        """
        tid = token_id or secrets.token_hex(16)
        ts = str(int(time.time()))
        nonce = secrets.token_hex(8)
        body = f"{tid}:{state}:{ts}:{nonce}"
        sig = self._sign(body)
        raw = f"{body}:{sig}"
        return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")

    def parse_and_verify_token(self, token_b64: str) -> Tuple[bool, str, str, int]:
        """
        Verifies signature, expiration, and extracts:
        (is_valid: bool, state: str, token_id: str, issued_at: int)
        """
        if not token_b64:
            return False, "unavailable", "", 0

        try:
            token_clean = token_b64.strip().strip('"')
            missing_padding = len(token_clean) % 4
            if missing_padding:
                token_clean += "=" * (4 - missing_padding)

            raw = base64.urlsafe_b64decode(token_clean.encode("utf-8")).decode("utf-8")
            parts = raw.split(":")
            if len(parts) != 5:
                return False, "unavailable", "", 0

            tid, state, ts_str, nonce, sig = parts
            body = f"{tid}:{state}:{ts_str}:{nonce}"
            expected_sig = self._sign(body)

            if not hmac.compare_digest(sig, expected_sig):
                logger.warning("Trial token signature mismatch. Tampering detected.")
                return False, "unavailable", tid, 0

            issued_at = int(ts_str)
            if time.time() - issued_at > COOKIE_MAX_AGE:
                logger.info("Trial token expired.")
                return False, "unavailable", tid, issued_at

            if state not in ("available", "processing", "consumed", "unavailable"):
                return False, "unavailable", tid, issued_at

            return True, state, tid, issued_at

        except Exception as e:
            logger.warning("Error parsing trial token: %s", e)
            return False, "unavailable", "", 0

    def get_trial_status(self, request: Request) -> Tuple[str, str]:
        """
        Inspects incoming cookie and returns (state: str, token_id: str).
        If cookie is absent, returns ('available', '') indicating a new trial can be provisioned.
        """
        cookie_val = request.cookies.get(COOKIE_NAME)
        if not cookie_val:
            return "available", ""

        is_valid, state, tid, _ = self.parse_and_verify_token(cookie_val)
        if not is_valid:
            return "unavailable", tid

        return state, tid

    def set_trial_cookie(self, response: Response, state: str = "available", token_id: Optional[str] = None) -> str:
        """Issues or updates the signed HttpOnly cookie on response."""
        new_token = self.create_token_payload(state=state, token_id=token_id)
        response.set_cookie(
            key=COOKIE_NAME,
            value=new_token,
            max_age=COOKIE_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            path="/",
        )
        return new_token

    def check_ip_rate_limit(self, request: Request) -> bool:
        """
        Checks client IP rate limits using a keyed SHA256 hash to avoid persisting raw IP addresses.
        Returns True if within limit, False if rate limited.
        """
        client_host = request.client.host if request.client else "unknown"
        ip_hash = hmac.new(self.secret, client_host.encode("utf-8"), hashlib.sha256).hexdigest()[:16]

        now = time.time()
        history = self._ip_history.get(ip_hash, [])
        history = [t for t in history if now - t < IP_RATE_LIMIT_WINDOW]

        if len(history) >= IP_RATE_LIMIT_MAX_ATTEMPTS:
            return False

        history.append(now)
        self._ip_history[ip_hash] = history
        return True

    async def reserve_trial(self, request: Request) -> str:
        """
        Verifies trial eligibility and acquires an in-process lock to prevent concurrent double-spends.
        Returns token_id if reservation succeeded.
        Raises TrialPolicyError if not eligible.
        """
        # IP Rate limit check
        if not self.check_ip_rate_limit(request):
            raise TrialPolicyError(
                "Rate limit exceeded. Please wait a moment before trying again.",
                status_code=429,
                state="unavailable",
            )

        cookie_val = request.cookies.get(COOKIE_NAME)
        if not cookie_val:
            # Generate new token ID for initial trial
            token_id = secrets.token_hex(16)
        else:
            is_valid, state, token_id, _ = self.parse_and_verify_token(cookie_val)
            if not is_valid:
                raise TrialPolicyError(
                    "Invalid or tampered trial credentials. Meta AI trial is unavailable.",
                    status_code=403,
                    state="unavailable",
                )
            if state == "consumed":
                raise TrialPolicyError(
                    "The single-use Meta AI trial for this browser identity has already been consumed. "
                    "Please switch to Local AI (Ollama) for unlimited hardware design assistance.",
                    status_code=403,
                    state="consumed",
                )
            if state != "available":
                raise TrialPolicyError(
                    f"Meta AI trial is currently {state}. Generation cannot proceed.",
                    status_code=403,
                    state=state,
                )

        # In-process atomic lock: prevent simultaneous requests on the same token ID
        async with self._lock:
            if token_id in self._active_tokens:
                raise TrialPolicyError(
                    "A Meta AI trial request is already in progress for this session. Concurrent requests are blocked.",
                    status_code=409,
                    state="processing",
                )
            self._active_tokens.add(token_id)

        return token_id

    async def release_and_consume_trial(
        self, token_id: str, response: Response, state: str = "consumed"
    ) -> None:
        """
        Releases the in-flight lock and stamps the cookie as 'consumed'.
        Called after external call initiation (regardless of outcome, to prevent refund abuse).
        """
        async with self._lock:
            self._active_tokens.discard(token_id)

        self.set_trial_cookie(response, state=state, token_id=token_id)


# Singleton trial manager instance
trial_manager = MetaTrialManager()
