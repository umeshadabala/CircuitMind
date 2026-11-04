import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_api.db")
    monkeypatch.setenv("CIRCUITMIND_DB", test_db)
    return TestClient(app)


def test_api_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "ollama" in data


def test_api_catalog_endpoints(client):
    res = client.get("/api/catalog")
    assert res.status_code == 200
    parts = res.json()
    assert len(parts) >= 10
    assert any(p["catalog_id"] == "ESP32-DEVKIT-V1" for p in parts)

    # Individual part lookup
    res_part = client.get("/api/catalog/HC-SR04")
    assert res_part.status_code == 200
    assert res_part.json()["catalog_id"] == "HC-SR04"


def test_api_project_lifecycle(client):
    # 1. Create project
    create_res = client.post(
        "/api/projects",
        json={"name": "Lifecycle Test", "description": "Testing CRUD", "target_board": "ESP32-DEVKIT-V1"},
    )
    assert create_res.status_code == 201
    proj = create_res.json()
    proj_id = proj["id"]
    assert proj["revision"] == 1

    # 2. Synthesize design from prompt
    syn_res = client.post(
        f"/api/projects/{proj_id}/synthesize",
        json={"prompt": "Build an ESP32 perimeter security alarm with buzzer and distance sensor"},
    )
    assert syn_res.status_code == 200
    syn_data = syn_res.json()
    assert syn_data["revision"] > 1
    assert len(syn_data["components"]) > 1

    # 2.5 Check diagnostic trace endpoint
    diag_res = client.get(f"/api/projects/{proj_id}/diagnostic-trace")
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    assert "request_id" in diag_data
    assert "model_identifier" in diag_data
    assert "provider_type" in diag_data
    assert diag_data["provider_type"] == "ollama"

    # 3. Check BOM artifact
    bom_res = client.get(f"/api/projects/{proj_id}/artifacts/bom")
    assert bom_res.status_code == 200
    assert bom_res.json()["total_components"] > 0

    # 4. Check Netlist artifact
    netlist_res = client.get(f"/api/projects/{proj_id}/artifacts/netlist")
    assert netlist_res.status_code == 200
    assert "kicad_format" in netlist_res.json()

    # 5. Check Firmware artifact
    fw_res = client.get(f"/api/projects/{proj_id}/artifacts/firmware")
    assert fw_res.status_code == 200
    assert "#include <Arduino.h>" in fw_res.json()["source_code"]

    # 5.5 Check Assembly Guide artifact
    guide_res = client.get(f"/api/projects/{proj_id}/artifacts/assembly-guide")
    assert guide_res.status_code == 200
    guide_md = guide_res.json()["markdown"]
    assert "## 1." in guide_md
    assert "## 14." in guide_md

    # 5.6 Test Adding Component via direct mutation
    add_comp_res = client.post(
        f"/api/projects/{proj_id}/components",
        json={"catalog_id": "LED-RED", "name": "Alert Indicator"},
    )
    assert add_comp_res.status_code == 200
    add_data = add_comp_res.json()
    assert any(c["catalog_id"] == "LED-RED" for c in add_data["components"])
    new_comp = next(c for c in add_data["components"] if c["catalog_id"] == "LED-RED")

    # Verify BOM updated with the new component
    bom_after_add = client.get(f"/api/projects/{proj_id}/artifacts/bom").json()
    assert any(item["catalog_id"] == "LED-RED" for item in bom_after_add["items"])

    # 5.7 Test Removing Component
    del_comp_res = client.delete(f"/api/projects/{proj_id}/components/{new_comp['instance_id']}")
    assert del_comp_res.status_code == 200
    del_data = del_comp_res.json()
    assert not any(c["instance_id"] == new_comp["instance_id"] for c in del_data["components"])

    # 6. Run simulation
    sim_res = client.post(f"/api/projects/{proj_id}/simulate", json={})
    assert sim_res.status_code == 200
    assert sim_res.json()["passed"] is True

    # 7. Copilot chat
    copilot_res = client.post(f"/api/projects/{proj_id}/copilot", json={"message": "Please add another red LED"})
    assert copilot_res.status_code == 200
    assert "reply" in copilot_res.json()

    # 8. Delete project
    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 200

    # Verify not found after deletion
    get_res = client.get(f"/api/projects/{proj_id}")
    assert get_res.status_code == 404

