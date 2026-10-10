import pytest
from unittest.mock import patch, MagicMock
from backend.app.config import settings
from backend.app.engine.llm import execute_llm_generation, ProjectGenerationError, ask_engineering_llm

def test_gemini_settings_loaded():
    assert settings.llm_provider == "gemini"
    assert settings.gemini_model == "gemini-3.8-flash"
    assert bool(settings.gemini_api_key) is True

def test_gemini_live_text_generation():
    audit = execute_llm_generation(
        prompt="Respond with exactly 'PONG_OK' and nothing else.",
        system_prompt="You are a precise hardware assistant.",
        format_json=False,
        timeout=30.0
    )
    assert audit["provider"] == "gemini"
    assert audit["provider_status"] == 200
    assert audit["resolved_model"] in ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"]
    assert "PONG" in audit["response_text"].upper()

def test_gemini_live_json_generation():
    audit = execute_llm_generation(
        prompt="Output JSON with keys 'board' (string 'esp32') and 'voltage' (number 3.3).",
        format_json=True,
        timeout=30.0
    )
    assert audit["provider"] == "gemini"
    assert audit["provider_status"] == 200
    assert "esp32" in audit["response_text"].lower()

def test_gemini_model_fallback():
    # Force primary model to an invalid model and ensure it falls back to gemini-3.8-flash / gemini-3.5-flash
    with patch.object(settings, "gemini_model", "gemini-invalid-999"):
        audit = execute_llm_generation(
            prompt="Reply with 'FALLBACK_SUCCESS'",
            format_json=False,
            timeout=30.0
        )
        assert audit["provider_status"] == 200
        assert audit["resolved_model"] in ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"]
        assert "FALLBACK_SUCCESS" in audit["response_text"] or len(audit["response_text"]) > 0

def test_gemini_all_models_failing_raises_error():
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        mock_resp.text = "Service Unavailable"
        mock_post.return_value = mock_resp
        
        with pytest.raises(ProjectGenerationError) as exc_info:
            execute_llm_generation(prompt="test", format_json=False, timeout=5.0)
        
        assert "Gemini API call failed across models" in str(exc_info.value)

def test_gemini_ask_engineering_llm():
    sample_context = {
        "title": "Smart Garden Monitor",
        "board": {
            "display_name": "ESP32 DevKit V1",
            "architecture": "Xtensa dual-core 32-bit",
            "voltage_logic": 3.3
        },
        "components": [{"name": "Soil Moisture Sensor"}],
        "pin_assignments": [{"component_id": "soil", "component_pin": "AOUT", "board_pin": "GPIO34", "signal_type": "ADC"}],
        "requirements": [{"id": "req-1", "description": "Read soil moisture using ADC"}]
    }
    answer = ask_engineering_llm(sample_context, "Which pin reads the soil sensor?")
    assert answer is not None
    assert "34" in answer or "GPIO" in answer

def test_gemini_health_endpoint():
    from fastapi.testclient import TestClient
    from backend.app.main import app

    client = TestClient(app)
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["llm_provider"] == "gemini"
    assert data["ai_status"] == "online"
    assert "gemini-3.8-flash" in data["llm_model"]

def test_gemini_full_project_generation():
    from backend.app.engine.planner import plan_project_from_prompt

    proj = plan_project_from_prompt("Build an automated plant watering system with soil sensor and relay on ESP32")
    assert proj is not None
    assert proj.board.type in ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"]
    assert len(proj.components) > 0
    assert len(proj.pin_assignments) > 0
    assert proj.firmware is not None
    assert len(proj.firmware) > 0
    assert len(proj.firmware[0].code) > 50

