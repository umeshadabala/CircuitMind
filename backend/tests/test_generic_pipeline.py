import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.domain.models import ComponentInstance, Net, NetType, PinReference, Project
from backend.app.services.validator import DRCValidator


@pytest.fixture
def client():
    return TestClient(app)


def test_arbitrary_synthetic_pipeline_synthesis(client):
    """
    Verifies that an arbitrary, non-standard user prompt (plant monitor with DS18B20,
    push button trigger, and green LED) is parsed and synthesized completely generically.
    """
    # 1. Create empty project
    create_res = client.post(
        "/api/projects",
        json={"name": "Plant Health Monitor", "description": "Arbitrary novel system", "target_board": "ESP32-DEVKIT-V1"},
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # 2. Synthesize using arbitrary novel requirements
    syn_res = client.post(
        f"/api/projects/{proj_id}/synthesize",
        json={"prompt": "Design a soil telemetry monitor with DS18B20 temperature probe, button trigger, and green indicator LED"},
    )
    assert syn_res.status_code == 200
    project_data = syn_res.json()

    # Verify components resolved from catalog
    cat_ids = [c["catalog_id"] for c in project_data["components"]]
    assert "ESP32-DEVKIT-V1" in cat_ids
    assert "DS18B20" in cat_ids
    assert "BTN-PUSH" in cat_ids
    assert "LED-GREEN" in cat_ids
    assert "RES-330R" in cat_ids  # Current limiter automatically inserted for LED

    # Verify nets generated
    assert len(project_data["nets"]) >= 4
    net_ids = [n["net_id"] for n in project_data["nets"]]
    assert "NET_3V3" in net_ids
    assert "NET_GND" in net_ids

    # Verify DRC passes
    drc_report = project_data.get("validation_report")
    assert drc_report is not None
    assert drc_report["valid"] is True
    assert len([f for f in drc_report["findings"] if f["severity"] == "ERROR"]) == 0

    # Verify firmware generation
    fw_res = client.get(f"/api/projects/{proj_id}/artifacts/firmware")
    assert fw_res.status_code == 200
    fw = fw_res.json()
    assert fw["target_platform"] == "esp32"
    assert "PIN_S" in fw["source_code"] or "PIN_BTN" in fw["source_code"] or "PIN_LED" in fw["source_code"]

    # Verify simulation execution
    sim_res = client.post(f"/api/projects/{proj_id}/simulate", json={})
    assert sim_res.status_code == 200
    assert sim_res.json()["passed"] is True


def test_component_position_presentation_update(client):
    """
    Verifies that updating a component's 2D canvas coordinates updates only
    presentation metadata without corrupting graph nets or mutating electrical revision.
    """
    create_res = client.post(
        "/api/projects",
        json={"name": "Canvas Layout Test", "target_board": "ESP32-DEVKIT-V1"},
    )
    proj_id = create_res.json()["id"]

    # Add component
    add_res = client.post(f"/api/projects/{proj_id}/components", json={"catalog_id": "ESP32-DEVKIT-V1"})
    assert add_res.status_code == 200
    comp_id = add_res.json()["components"][0]["instance_id"]
    initial_rev = add_res.json()["revision"]

    # Move node on canvas
    pos_res = client.put(
        f"/api/projects/{proj_id}/components/{comp_id}/position",
        json={"x": 450.5, "y": 720.0},
    )
    assert pos_res.status_code == 200
    updated = pos_res.json()
    target_comp = next(c for c in updated["components"] if c["instance_id"] == comp_id)
    assert target_comp["position"]["x"] == 450.5
    assert target_comp["position"]["y"] == 720.0
    # Presentation position updates do not increment electrical graph revision
    assert updated["revision"] == initial_rev


def test_project_deletion_persistence(client):
    """
    Verifies that deleting a project removes it permanently and transactionally
    from storage, returning 404 on subsequent lookups and disappearing from the project list.
    """
    create_res = client.post(
        "/api/projects",
        json={"name": "Ephemeral Project", "target_board": "ESP32-DEVKIT-V1"},
    )
    proj_id = create_res.json()["id"]

    # Ensure it exists
    get_res = client.get(f"/api/projects/{proj_id}")
    assert get_res.status_code == 200

    # Delete project
    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Verify 404 on direct lookup
    lookup_res = client.get(f"/api/projects/{proj_id}")
    assert lookup_res.status_code == 404

    # Verify not present in projects listing
    list_res = client.get("/api/projects")
    assert list_res.status_code == 200
    all_ids = [p["id"] for p in list_res.json()]
    assert proj_id not in all_ids


def test_drc_auto_repair_bounded_mutation(client):
    """
    Verifies that an unresisted LED is flagged by DRC, and calling auto-repair
    mutates the canonical graph by inserting a current-limiting resistor and
    rewiring nets, resulting in a clean DRC pass.
    """
    create_res = client.post(
        "/api/projects",
        json={"name": "Repair Test", "target_board": "ESP32-DEVKIT-V1"},
    )
    proj_id = create_res.json()["id"]

    # Add LED (MCU U1 is already initialized in new project)
    client.post(f"/api/projects/{proj_id}/components", json={"catalog_id": "LED-RED"})

    # Check validation - should have warning or error regarding unresisted LED / unconnected pins
    val_res = client.get(f"/api/projects/{proj_id}/validation")
    assert val_res.status_code == 200
    report = val_res.json()
    rule_ids = [f["rule_id"] for f in report["findings"]]
    assert any("DRC" in r for r in rule_ids)

    # Trigger DRC auto-repair
    repair_res = client.post(f"/api/projects/{proj_id}/repair")
    assert repair_res.status_code == 200
    repair_data = repair_res.json()
    assert "actions_taken" in repair_data
    assert len(repair_data["actions_taken"]) > 0

    repaired_project = repair_data["project"]
    repaired_parts = [c["catalog_id"] for c in repaired_project["components"]]
    assert "RES-330R" in repaired_parts or "RES-220R" in repaired_parts

    # Re-check DRC validation - should be valid
    val_after = client.get(f"/api/projects/{proj_id}/validation").json()
    assert val_after["valid"] is True
