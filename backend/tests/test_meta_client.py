import json
import pytest
import httpx
from backend.app.ai.meta_client import (
    MetaAIClient,
    MetaAIConfigError,
    MetaAIAuthError,
    MetaAIRateLimitError,
    MetaAITimeoutError,
    MetaAIError,
)


@pytest.mark.asyncio
async def test_meta_client_unconfigured_raises_error():
    """Unconfigured client must immediately raise MetaAIConfigError without making network calls."""
    client = MetaAIClient(api_key="", model_id="llama-3.3-70b-instruct")
    assert not client.is_configured()

    health = await client.check_availability()
    assert health["status"] == "unconfigured"
    assert health["configured"] is False

    with pytest.raises(MetaAIConfigError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert "not configured" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_meta_client_prompt_length_limit():
    """Prompts exceeding maximum character limit must be rejected before calling API."""
    client = MetaAIClient(api_key="valid-dummy-key")
    long_prompt = "x" * 5000  # Exceeds default limit of 3000

    with pytest.raises(MetaAIError) as exc_info:
        await client.generate_chat_json(prompt=long_prompt, system_prompt="System")
    assert "character limit" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_meta_client_successful_response(monkeypatch):
    """Verifies that a valid 200 response from Meta Model API returns parsed structured JSON."""
    client = MetaAIClient(api_key="valid-dummy-key")

    mock_response_payload = {
        "id": "chatcmpl-test-123",
        "object": "chat.completion",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": json.dumps({
                        "message": "Added red LED with 330 ohm series resistor.",
                        "actions": [{"action_type": "add_component", "catalog_id": "LED-RED"}],
                    }),
                },
                "finish_reason": "stop",
            }
        ],
    }

    async def mock_post(*args, **kwargs):
        req = httpx.Request("POST", "https://api.meta.ai/v1/chat/completions")
        return httpx.Response(200, json=mock_response_payload, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await client.generate_chat_json(prompt="Add an LED", system_prompt="System instructions")
    assert "message" in result
    assert "actions" in result
    assert result["actions"][0]["catalog_id"] == "LED-RED"


@pytest.mark.asyncio
async def test_meta_client_auth_failure_mapping(monkeypatch):
    """Verifies that 401/403 status is mapped to MetaAIAuthError with sanitized user message."""
    client = MetaAIClient(api_key="invalid-key")

    async def mock_post(*args, **kwargs):
        req = httpx.Request("POST", "https://api.meta.ai/v1/chat/completions")
        return httpx.Response(401, json={"error": {"message": "Invalid API Key"}}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    with pytest.raises(MetaAIAuthError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert exc_info.value.status_code == 401
    assert "authentication failed" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_meta_client_rate_limit_mapping(monkeypatch):
    """Verifies that 429 status is mapped to MetaAIRateLimitError."""
    client = MetaAIClient(api_key="valid-key")

    async def mock_post(*args, **kwargs):
        req = httpx.Request("POST", "https://api.meta.ai/v1/chat/completions")
        return httpx.Response(429, json={"error": "Too Many Requests"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    with pytest.raises(MetaAIRateLimitError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert exc_info.value.status_code == 429
    assert "rate limit" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_meta_client_timeout_handling(monkeypatch):
    """Verifies that httpx timeout is cleanly mapped to MetaAITimeoutError."""
    client = MetaAIClient(api_key="valid-key")

    async def mock_post(*args, **kwargs):
        raise httpx.TimeoutException("Connection timed out")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    with pytest.raises(MetaAITimeoutError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.user_message.lower()

