import json
import pytest
from fastapi.testclient import TestClient
import httpx
from backend.app.main import app
from backend.app.config import settings


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_copilot_providers.db")
    monkeypatch.setenv("CIRCUITMIND_DB", test_db)
    monkeypatch.setenv("MODEL_API_KEY", "test-meta-api-key-xyz")
    return TestClient(app)


def test_meta_trial_status_endpoint(client):
    """GET /api/ai/meta/trial-status should return trial status and issue signed cookie."""
    res = client.get("/api/ai/meta/trial-status")
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "meta"
    assert data["status"] == "available"
    assert data["trial_available"] is True
    assert "cm_meta_trial" in res.headers.get("set-cookie", "")


def test_copilot_local_provider_remains_active(client):
    """Local provider continues functioning without requiring Meta AI or trial cookie."""
    create_res = client.post("/api/projects", json={"name": "Provider Test", "description": "Local test"})
    proj_id = create_res.json()["id"]

    res = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "What is the status of this design?", "provider": "local"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert data.get("provider") == "local"


def test_copilot_meta_provider_one_trial_enforcement(client, monkeypatch):
    """
    Tests that Meta AI:
    1. Consumes the one-time trial on first use.
    2. Enforces mutation actions on the project graph.
    3. Blocks the second attempt with 403 Forbidden.
    """
    create_res = client.post("/api/projects", json={"name": "Meta Project", "description": "Testing Meta API"})
    proj_id = create_res.json()["id"]

    mock_response_payload = {
        "id": "meta-chat-1",
        "object": "chat.completion",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": json.dumps({
                        "message": "Meta AI added a Piezo buzzer to the circuit.",
                        "actions": [{"action_type": "add_component", "catalog_id": "BUZZER-PIEZO"}],
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

    # First attempt with Meta AI — should succeed and return Set-Cookie with consumed state
    res1 = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "Please add a buzzer for alert sounds", "provider": "meta"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["provider"] == "meta"
    assert "Piezo buzzer" in data1["reply"]

    # Verify component was actually added to project graph
    get_proj = client.get(f"/api/projects/{proj_id}").json()
    assert any("BUZZER" in c["catalog_id"] for c in get_proj["components"])

    # Second attempt with Meta AI using the same client session (carrying the consumed cookie)
    res2 = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "Add an LED now please", "provider": "meta"},
    )
    assert res2.status_code == 403
    assert "already been consumed" in res2.json()["detail"].lower()

    # Local AI must STILL be available even after Meta trial is consumed
    res3 = client.post(
        f"/api/projects/{proj_id}/copilot",
        json={"message": "Add a red LED please", "provider": "local"},
    )
    assert res3.status_code == 200
    assert res3.json()["provider"] == "local"

