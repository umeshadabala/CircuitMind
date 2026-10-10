"""
Development Seed Script for CircuitMind
Initializes the SQLite database with:
1. Authentic Component Catalog records from manufacturer datasheets
2. Canonical initial projects (Smart Parking Sensor, Temp Monitor, etc.)
3. Initial Engineering Memory events
"""
from backend.app.models.project import Project
import uuid
from backend.app.database.db import (
    init_db,
    save_project,
    get_project,
    list_projects,
    insert_memory_event,
    get_connection
)
from backend.app.services.catalog_service import ComponentCatalogService
from backend.app.engine.planner import (
    create_smart_parking_sensor_project,
    plan_project_from_prompt
)
from backend.app.models.memory import MemoryEvent
from backend.app.models.project import utc_now_iso

def seed_catalog():
    """Seeds authentic component catalog records from manufacturer datasheets."""
    init_db()
    ComponentCatalogService.initialize_catalog()

# ==============================================================================
# TEST / DEMO PROJECT GENERATION (DISABLED / COMMENTED OUT)
# ==============================================================================
# def seed_demo_project(project_type: str = "parking") -> Project:
#     """
#     Opt-in development fixture: Seeds a canonical demonstration project into SQLite.
#     Never run automatically on production startup or page load.
#     """
#     init_db()
#     seed_catalog()
# 
#     if project_type == "hospital":
#         from backend.app.engine.planner import create_hospital_patient_monitor_project
#         proj = create_hospital_patient_monitor_project(project_id="proj-hospital-monitor-esp32")
#     elif project_type == "quadcopter":
#         from backend.app.engine.planner import plan_project_from_prompt
#         proj = plan_project_from_prompt("Build an ESP32 Quad-copter Flight Controller (Simulation-Only) with MPU6050 IMU, 4 ESC interfaces, arming switch, status LED, and buzzer.")
#         proj.id = "proj-da623a03"
#     else:
#         proj = create_smart_parking_sensor_project(project_id="proj-smart-parking-esp32", threshold_cm=20.0)
# 
#     save_project(proj.model_dump())
# 
#     # Record Engineering Memory events for the demo project
#     insert_memory_event(MemoryEvent(
#         project_id=proj.id,
#         event_type="PROJECT_SEEDED",
#         summary=f"Canonical demonstration project seeded: {proj.title}",
#         rationale="Initial requirements established according to demonstration fixtures.",
#         payload={"board": proj.board.type},
#         related_entity_id=proj.id,
#         project_version=1,
#         timestamp=utc_now_iso()
#     ))
# 
#     insert_memory_event(MemoryEvent(
#         project_id=proj.id,
#         event_type="ARCHITECTURE_DECISION",
#         summary=f"Microcontroller selected: {proj.board.display_name}",
#         rationale="Selected for dual-core 240MHz performance, hardware PWM timer channels, and hardware I2C support.",
#         payload={"voltage_logic": proj.board.voltage_logic, "board_type": proj.board.type},
#         project_version=1,
#         timestamp=utc_now_iso()
#     ))
# 
#     return proj

def seed_demo_project(project_type: str = "parking"):
    """Test and demo project generation is disabled."""
    return None

def seed_database(force: bool = False):
    """Initializes the database and component catalog. Does NOT create test/demo projects."""
    init_db()
    seed_catalog()
    # Demo project generation commented out / disabled
    # if force:
    #     seed_demo_project("parking")
    return list_projects()

if __name__ == "__main__":
    projects = seed_database(force=False)
    print(f"Database initialized successfully. {len(projects)} projects available.")
