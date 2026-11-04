import pytest
from backend.app.domain.models import Project
from backend.app.services.pipeline import PipelineService
from backend.app.storage.repository import ProjectRepository


@pytest.fixture
def clean_repo(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_regressions.db")
    monkeypatch.setenv("CIRCUITMIND_DB", db_path)
    return ProjectRepository()


@pytest.mark.asyncio
async def test_regression_three_materially_different_projects(clean_repo):
    pipeline = PipelineService(repository=clean_repo)

    # 1. Project 1: Anti-Theft System
    p1 = Project(id="reg-1", name="Perimeter Alarm", description="Theft prevention", revision=1, created_at="", updated_at="")
    clean_repo.save_project(p1)
    res1 = await pipeline.execute_full_pipeline(p1, "Build an ESP32 ultrasonic anti-theft perimeter system with buzzer alarm")

    p1_catalog_ids = {c.catalog_id for c in res1.components}
    assert "HC-SR04" in p1_catalog_ids
    assert "BUZZER-PIEZO" in p1_catalog_ids
    assert "DIVIDER-5V-3V3" in p1_catalog_ids  # Divider must be added for safety

    # 2. Project 2: Temperature-Monitoring System
    p2 = Project(id="reg-2", name="Thermal Monitor", description="Temperature telemetry", revision=1, created_at="", updated_at="")
    clean_repo.save_project(p2)
    res2 = await pipeline.execute_full_pipeline(p2, "Build a temperature monitoring system with DS18B20 and OLED display")

    p2_catalog_ids = {c.catalog_id for c in res2.components}
    assert "DS18B20" in p2_catalog_ids
    assert "OLED-SSD1306" in p2_catalog_ids
    assert "HC-SR04" not in p2_catalog_ids

    # 3. Project 3: Traffic-Light Controller
    p3 = Project(id="reg-3", name="Intersection Controller", description="Traffic signals", revision=1, created_at="", updated_at="")
    clean_repo.save_project(p3)
    res3 = await pipeline.execute_full_pipeline(p3, "Create an automated traffic light controller with Red, Yellow, and Green LEDs")

    p3_catalog_ids = {c.catalog_id for c in res3.components}
    assert "LED-RED" in p3_catalog_ids
    assert "LED-YELLOW" in p3_catalog_ids
    assert "LED-GREEN" in p3_catalog_ids
    assert "DS18B20" not in p3_catalog_ids

    # Verify that the three architectures and component sets are distinct
    assert p1_catalog_ids != p2_catalog_ids
    assert p2_catalog_ids != p3_catalog_ids
    assert p1_catalog_ids != p3_catalog_ids

    # Verify DRC validity for all 3 designs
    assert res1.validation_report is not None and res1.validation_report.valid
    assert res2.validation_report is not None and res2.validation_report.valid
    assert res3.validation_report is not None and res3.validation_report.valid

    # Verify that revision was incremented upon synthesis
    assert res1.revision > 1
    assert res2.revision > 1
    assert res3.revision > 1

