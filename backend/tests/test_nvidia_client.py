import json
from unittest.mock import AsyncMock, MagicMock
import httpx
import openai
import pytest
from backend.app.ai.nvidia_client import (
    NVIDIAClient,
    NVIDIAAIConfigError,
    NVIDIAAIAuthError,
    NVIDIAAIRateLimitError,
    NVIDIAAITimeoutError,
    NVIDIAAIError,
)
from backend.app.main import app
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_nvidia_client_unconfigured_raises_error():
    """Unconfigured client must immediately raise NVIDIAAIConfigError without making network calls."""
    client = NVIDIAClient(api_key="", model_id="meta/muse-glimmer-30b")
    assert not client.is_configured()

    health = await client.check_availability()
    assert health["status"] == "unconfigured"
    assert health["configured"] is False

    with pytest.raises(NVIDIAAIConfigError) as exc_info:
        await client.generate_chat_json(prompt="Add a sensor", system_prompt="System")
    assert "not configured" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_nvidia_client_prompt_length_limit():
    """Prompts exceeding maximum character limit must be rejected before calling API."""
    client = NVIDIAClient(api_key="nvapi-valid-dummy-key")
    long_prompt = "x" * 5000  # Exceeds default limit of 3000

    with pytest.raises(NVIDIAAIError) as exc_info:
        await client.generate_chat_json(prompt=long_prompt, system_prompt="System")
    assert exc_info.value.status_code == 400
    assert "character limit" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_nvidia_client_successful_response(monkeypatch):
    """Verifies that a valid response from NVIDIA NIM returns parsed structured JSON."""
    client = NVIDIAClient(api_key="nvapi-valid-dummy-key")

    mock_content = json.dumps({
        "message": "Added DS18B20 temperature sensor to 1-Wire bus.",
        "actions": [{"action_type": "add_component", "catalog_id": "DS18B20"}],
    })

    mock_choice = MagicMock()
    mock_choice.message.content = mock_content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_create = AsyncMock(return_value=mock_response)
    mock_openai = MagicMock()
    mock_openai.chat.completions.create = mock_create

    monkeypatch.setattr(client, "_get_client", lambda: mock_openai)

    result = await client.generate_chat_json(prompt="Add temperature sensor", system_prompt="System instructions")
    assert "message" in result
    assert "actions" in result
    assert result["actions"][0]["catalog_id"] == "DS18B20"
    mock_create.assert_awaited_once()


@pytest.mark.asyncio
async def test_nvidia_client_auth_failure_mapping(monkeypatch):
    """Verifies that 401/403 status from OpenAI SDK is mapped to NVIDIAAIAuthError."""
    client = NVIDIAClient(api_key="nvapi-invalid-key")

    req = httpx.Request("POST", "https://integrate.api.nvidia.com/v1/chat/completions")
    res = httpx.Response(401, request=req)
    auth_error = openai.AuthenticationError("Invalid API key", response=res, body={"error": "unauthorized"})

    mock_create = AsyncMock(side_effect=auth_error)
    mock_openai = MagicMock()
    mock_openai.chat.completions.create = mock_create

    monkeypatch.setattr(client, "_get_client", lambda: mock_openai)

    with pytest.raises(NVIDIAAIAuthError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert exc_info.value.status_code == 401
    assert "authentication failed" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_nvidia_client_rate_limit_mapping(monkeypatch):
    """Verifies that 429 status is mapped to NVIDIAAIRateLimitError."""
    client = NVIDIAClient(api_key="nvapi-valid-key")

    req = httpx.Request("POST", "https://integrate.api.nvidia.com/v1/chat/completions")
    res = httpx.Response(429, request=req)
    rate_error = openai.RateLimitError("Rate limit exceeded", response=res, body={"error": "too_many_requests"})

    mock_create = AsyncMock(side_effect=rate_error)
    mock_openai = MagicMock()
    mock_openai.chat.completions.create = mock_create

    monkeypatch.setattr(client, "_get_client", lambda: mock_openai)

    with pytest.raises(NVIDIAAIRateLimitError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert exc_info.value.status_code == 429
    assert "rate limit exceeded" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_nvidia_client_timeout_handling(monkeypatch):
    """Verifies that request timeouts are mapped to NVIDIAAITimeoutError."""
    client = NVIDIAClient(api_key="nvapi-valid-key")

    req = httpx.Request("POST", "https://integrate.api.nvidia.com/v1/chat/completions")
    timeout_error = openai.APITimeoutError(request=req)

    mock_create = AsyncMock(side_effect=timeout_error)
    mock_openai = MagicMock()
    mock_openai.chat.completions.create = mock_create

    monkeypatch.setattr(client, "_get_client", lambda: mock_openai)

    with pytest.raises(NVIDIAAITimeoutError) as exc_info:
        await client.generate_chat_json(prompt="Add an LED", system_prompt="System")
    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.user_message.lower()


@pytest.mark.asyncio
async def test_nvidia_client_check_availability(monkeypatch):
    """Verifies non-billable check_availability correctly checks models."""
    client = NVIDIAClient(api_key="nvapi-valid-key", model_id="meta/muse-glimmer-30b")

    mock_model = MagicMock()
    mock_model.id = "meta/muse-glimmer-30b"
    mock_list_response = MagicMock()
    mock_list_response.data = [mock_model]

    mock_models_list = AsyncMock(return_value=mock_list_response)
    mock_openai = MagicMock()
    mock_openai.models.list = mock_models_list

    monkeypatch.setattr(client, "_get_client", lambda: mock_openai)

    health = await client.check_availability()
    assert health["status"] == "connected"
    assert health["configured"] is True
    assert health["model_verified"] is True
    assert "meta/muse-glimmer-30b" in health["available_models"]


def test_copilot_nvidia_provider_one_trial_enforcement(client, monkeypatch):
    """
    Tests that NVIDIA NIM:
    1. Consumes the one-time trial on first use.
    2. Modifies the project graph.
    3. Blocks the second attempt with 403 Forbidden.
    4. Leaves Local AI accessible.
    """
    create_res = client.post("/api/projects", json={"name": "NVIDIA Project", "description": "Testing NVIDIA NIM"})
    proj_id = create_res.json()["id"]

    mock_content = json.dumps({
        "message": "NVIDIA NIM added a buzzer to the circuit.",
        "actions": [{"action_type": "add_component", "catalog_id": "BUZZER-PIEZO"}],
    })

    mock_choice = MagicMock()
    mock_choice.message.content = mock_content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_create = AsyncMock(return_value=mock_response)
    mock_openai = MagicMock()
    mock_openai.chat.completions.create = mock_create

    from backend.app.api import routes
    monkeypatch.setattr(routes.nvidia_client, "_get_client", lambda: mock_openai)
    monkeypatch.setattr(routes.nvidia_client, "is_configured", lambda: True)

    # First attempt with NVIDIA NIM — should succeed and return Set-Cookie with consumed state
    res1 = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "Please add a buzzer for alert sounds", "provider": "nvidia"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["provider"] == "nvidia"
    assert "buzzer" in data1["reply"]

    # Verify component was actually added to project graph
    get_proj = client.get(f"/api/projects/{proj_id}").json()
    assert any("BUZZER" in c["catalog_id"] for c in get_proj["components"])

    # Second attempt with NVIDIA NIM using same client session (carrying consumed cookie)
    res2 = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "Add an LED now please", "provider": "nvidia"},
    )
    assert res2.status_code == 403
    assert "already been consumed" in res2.json()["detail"].lower()

    # Local AI must STILL be available even after trial is consumed
    res3 = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "What components are in this design?", "provider": "local"},
    )
    assert res3.status_code == 200
    assert res3.json()["provider"] == "local"


def test_update_ai_models_settings_endpoint():
    """Verify runtime model selection, active provider switching, and BYOK settings update endpoint."""
    client = TestClient(app)
    from backend.app.api import routes

    res = client.post(
        "/api/settings/ai-models",
        json={
            "ollama_model": "muse-spark-open:cloud",
            "nvidia_api_key": "nvapi-custom-byok-test",
            "nvidia_model": "meta/muse-glimmer-30b",
            "active_provider": "nvidia",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["active_provider"] == "nvidia"
    assert routes.active_provider == "nvidia"
    assert routes.ollama_client.model == "muse-spark-open:cloud"
    assert routes.nvidia_client.api_key == "nvapi-custom-byok-test"
    assert routes.nvidia_client.model_id == "meta/muse-glimmer-30b"

    # Switch back to local
    res2 = client.post("/api/settings/ai-models", json={"active_provider": "local"})
    assert res2.status_code == 200
    assert res2.json()["active_provider"] == "local"
    assert routes.active_provider == "local"


@pytest.mark.asyncio
async def test_pipeline_synthesis_with_nvidia_provider(monkeypatch):
    """Verifies that the normal pipeline synthesis can execute with NVIDIA NIM provider."""
    from backend.app.services.pipeline import PipelineService
    from backend.app.domain.models import Project

    mock_req_json = {
        "system_overview": "Weather station with temperature sensor",
        "inputs_and_sensors": ["Temperature & Humidity Sensor (DHT22)"],
        "outputs_and_actuators": ["OLED Display 128x64"],
        "controller_requirements": "ESP32",
        "power_requirements": "3.3V",
        "environmental_constraints": "Indoor usage, -10 to 50 C",
    }
    mock_arch_json = {
        "functional_blocks": [{"name": "sensor"}, {"name": "display"}, {"name": "controller"}],
        "proposed_parts": ["ESP32-DEVKIT-V1", "DHT22", "OLED-SSD1306"],
        "power_domains": ["3.3V", "GND"],
        "firmware_responsibilities": ["Read temperature", "Render display"],
    }

    mock_client = MagicMock()
    # Return mock requirements on first call, mock architecture on second call
    mock_client.generate_chat_json = AsyncMock(side_effect=[mock_req_json, mock_arch_json])
    mock_client.is_configured = MagicMock(return_value=True)
    mock_client.model_id = "meta/muse-glimmer-30b"
    mock_client.base_url = "https://integrate.api.nvidia.com/v1"

    pipe = PipelineService(nvidia_client=mock_client)
    proj = Project(id="test-proj-nvidia", name="Weather Station", description="Weather Station demo", target_board="AUTO")

    updated = await pipe.execute_full_pipeline(proj, "Build a weather station", provider="nvidia")
    assert updated.requirements is not None
    assert updated.architecture is not None
    assert any("DHT22" in c.catalog_id for c in updated.components)
    assert mock_client.generate_chat_json.call_count == 2



