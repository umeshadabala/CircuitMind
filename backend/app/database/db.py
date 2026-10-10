import sqlite3
import json
from typing import List, Optional, Dict, Any
from pathlib import Path
from backend.app.config import DB_PATH
from backend.app.models.memory import MemoryEvent

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            board_type TEXT,
            version INTEGER DEFAULT 1,
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    # Engineering Memory (DMAI Event Log) table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS engineering_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            summary TEXT NOT NULL,
            rationale TEXT,
            payload_json TEXT,
            related_entity_id TEXT,
            project_version INTEGER DEFAULT 1,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)
    
    # Simulation runs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS simulation_runs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            runner TEXT DEFAULT 'circuitmind_behavioral',
            status TEXT NOT NULL,
            duration_ms INTEGER,
            exit_code INTEGER,
            serial_logs_json TEXT,
            test_results_json TEXT,
            observations_json TEXT,
            error_details TEXT,
            setup_instructions_json TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            summary TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)

    # Migration for simulation_runs if table was created previously without new columns
    cursor.execute("PRAGMA table_info(simulation_runs)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    if "runner" not in existing_cols:
        cursor.execute("ALTER TABLE simulation_runs ADD COLUMN runner TEXT DEFAULT 'circuitmind_behavioral'")
    if "duration_ms" not in existing_cols:
        cursor.execute("ALTER TABLE simulation_runs ADD COLUMN duration_ms INTEGER")
    if "exit_code" not in existing_cols:
        cursor.execute("ALTER TABLE simulation_runs ADD COLUMN exit_code INTEGER")
    if "error_details" not in existing_cols:
        cursor.execute("ALTER TABLE simulation_runs ADD COLUMN error_details TEXT")
    if "setup_instructions_json" not in existing_cols:
        cursor.execute("ALTER TABLE simulation_runs ADD COLUMN setup_instructions_json TEXT")

    # Component Catalog Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS component_catalog (
            part_id TEXT PRIMARY KEY,
            canonical_name TEXT NOT NULL,
            manufacturer TEXT,
            model TEXT,
            category TEXT NOT NULL,
            board_compatibility_json TEXT,
            electrical_characteristics_json TEXT,
            pins_json TEXT,
            datasheet_url TEXT,
            source_metadata_json TEXT,
            image_url TEXT,
            image_attribution TEXT,
            wokwi_part_id TEXT,
            firmware_libraries_json TEXT,
            known_limitations_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # Relational Project Graph tables for normalization
    # Check if migration to composite primary key (project_id, id) is needed
    cursor.execute("PRAGMA table_info(project_requirements)")
    req_cols = cursor.fetchall()
    pk_count = sum(1 for col in req_cols if col[5] > 0)
    if pk_count == 1:
        cursor.execute("DROP TABLE IF EXISTS project_requirements")
        cursor.execute("DROP TABLE IF EXISTS project_components")
        cursor.execute("DROP TABLE IF EXISTS project_connections")
        cursor.execute("DROP TABLE IF EXISTS project_tests")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_requirements (
            id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            description TEXT NOT NULL,
            priority TEXT DEFAULT 'required',
            category TEXT DEFAULT 'sensing',
            target_value TEXT,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_components (
            id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            part_id TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            pins_json TEXT,
            attributes_json TEXT,
            description TEXT,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_pin_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            component_id TEXT NOT NULL,
            component_pin TEXT NOT NULL,
            board_pin TEXT NOT NULL,
            signal_type TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_connections (
            id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            from_component TEXT NOT NULL,
            from_pin TEXT NOT NULL,
            to_component TEXT NOT NULL,
            to_pin TEXT NOT NULL,
            color TEXT DEFAULT 'orange',
            signal_type TEXT DEFAULT 'DIGITAL',
            description TEXT,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_tests (
            id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            requirement_id TEXT,
            given TEXT NOT NULL,
            when_clause TEXT NOT NULL,
            then_clause TEXT NOT NULL,
            test_type TEXT DEFAULT 'threshold_trigger',
            parameters_json TEXT,
            PRIMARY KEY (project_id, id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)
    
    # Create indexes for fast lookup
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_project ON engineering_memory(project_id, event_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sim_project ON simulation_runs(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_catalog_category ON component_catalog(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_req_proj ON project_requirements(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_comp_proj ON project_components(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pin_proj ON project_pin_assignments(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_conn_proj ON project_connections(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_proj ON project_tests(project_id)")
    
    conn.commit()
    conn.close()

# Database helper functions
def save_project(project_data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    project_id = project_data["id"]
    cursor.execute("""
        INSERT INTO projects (id, title, description, board_type, version, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            description=excluded.description,
            board_type=excluded.board_type,
            version=excluded.version,
            data_json=excluded.data_json,
            updated_at=excluded.updated_at
    """, (
        project_id,
        project_data.get("title", "Untitled Project"),
        project_data.get("description", ""),
        project_data.get("board", {}).get("type", "esp32-devkit-v1"),
        project_data.get("version", 1),
        json.dumps(project_data),
        project_data.get("created_at", ""),
        project_data.get("updated_at", "")
    ))

    # Synchronize normalized child tables for relational querying
    cursor.execute("DELETE FROM project_requirements WHERE project_id = ?", (project_id,))
    for req in project_data.get("requirements", []):
        cursor.execute("""
            INSERT OR REPLACE INTO project_requirements (id, project_id, version, description, priority, category, target_value)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (req["id"], project_id, project_data.get("version", 1), req.get("description", ""), req.get("priority", "required"), req.get("category", "sensing"), str(req.get("target_value", "")) if req.get("target_value") is not None else None))

    cursor.execute("DELETE FROM project_components WHERE project_id = ?", (project_id,))
    for comp in project_data.get("components", []):
        cursor.execute("""
            INSERT OR REPLACE INTO project_components (id, project_id, version, part_id, name, category, pins_json, attributes_json, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (comp["id"], project_id, project_data.get("version", 1), comp["part_id"], comp["name"], comp.get("category", ""), json.dumps(comp.get("pins", [])), json.dumps(comp.get("attributes", {})), comp.get("description")))

    cursor.execute("DELETE FROM project_pin_assignments WHERE project_id = ?", (project_id,))
    for pa in project_data.get("pin_assignments", []):
        cursor.execute("""
            INSERT INTO project_pin_assignments (project_id, version, component_id, component_pin, board_pin, signal_type)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (project_id, project_data.get("version", 1), pa["component_id"], pa["component_pin"], pa["board_pin"], pa.get("signal_type", "DIGITAL_IN")))

    cursor.execute("DELETE FROM project_connections WHERE project_id = ?", (project_id,))
    for conn_item in project_data.get("connections", []):
        cursor.execute("""
            INSERT OR REPLACE INTO project_connections (id, project_id, version, from_component, from_pin, to_component, to_pin, color, signal_type, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (conn_item["id"], project_id, project_data.get("version", 1), conn_item["from_component"], conn_item["from_pin"], conn_item["to_component"], conn_item["to_pin"], conn_item.get("color", "orange"), conn_item.get("signal_type", "DIGITAL"), conn_item.get("description")))

    cursor.execute("DELETE FROM project_tests WHERE project_id = ?", (project_id,))
    for test_item in project_data.get("tests", []):
        cursor.execute("""
            INSERT OR REPLACE INTO project_tests (id, project_id, version, name, requirement_id, given, when_clause, then_clause, test_type, parameters_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (test_item["id"], project_id, project_data.get("version", 1), test_item["name"], test_item.get("requirement_id"), test_item.get("given", ""), test_item.get("when", ""), test_item.get("then", ""), test_item.get("test_type", "threshold_trigger"), json.dumps(test_item.get("parameters", {}))))

    conn.commit()
    conn.close()

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT data_json FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row["data_json"])
    return None

def list_projects() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, description, board_type, version, created_at, updated_at FROM projects ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_project(project_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not cursor.fetchone():
        conn.close()
        return False
        
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    cursor.execute("DELETE FROM engineering_memory WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM simulation_runs WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM project_requirements WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM project_components WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM project_pin_assignments WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM project_connections WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM project_tests WHERE project_id = ?", (project_id,))
    conn.commit()
    conn.close()
    return True

def reset_database():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects")
    cursor.execute("DELETE FROM engineering_memory")
    cursor.execute("DELETE FROM simulation_runs")
    cursor.execute("DELETE FROM project_requirements")
    cursor.execute("DELETE FROM project_components")
    cursor.execute("DELETE FROM project_pin_assignments")
    cursor.execute("DELETE FROM project_connections")
    cursor.execute("DELETE FROM project_tests")
    conn.commit()
    cursor.execute("VACUUM")
    conn.commit()
    conn.close()

def insert_memory_event(event: MemoryEvent) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO engineering_memory 
        (project_id, event_type, summary, rationale, payload_json, related_entity_id, project_version, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event.project_id,
        event.event_type,
        event.summary,
        event.rationale,
        json.dumps(event.payload),
        event.related_entity_id,
        event.project_version,
        event.timestamp
    ))
    event_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return event_id

def get_memory_events(project_id: str, event_type: Optional[str] = None, search: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM engineering_memory WHERE project_id = ?"
    params = [project_id]
    
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
        
    if search:
        query += " AND (summary LIKE ? OR rationale LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        if d.get("payload_json"):
            try:
                d["payload"] = json.loads(d["payload_json"])
            except Exception:
                d["payload"] = {}
        results.append(d)
    return results

def save_simulation_run(run_data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO simulation_runs 
        (id, project_id, version, runner, status, duration_ms, exit_code, serial_logs_json, test_results_json, observations_json, error_details, setup_instructions_json, started_at, completed_at, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            runner=excluded.runner,
            status=excluded.status,
            duration_ms=excluded.duration_ms,
            exit_code=excluded.exit_code,
            serial_logs_json=excluded.serial_logs_json,
            test_results_json=excluded.test_results_json,
            observations_json=excluded.observations_json,
            error_details=excluded.error_details,
            setup_instructions_json=excluded.setup_instructions_json,
            completed_at=excluded.completed_at,
            summary=excluded.summary
    """, (
        run_data["id"],
        run_data["project_id"],
        run_data.get("version", 1),
        run_data.get("runner", "circuitmind_behavioral"),
        run_data.get("status", "ready"),
        run_data.get("duration_ms"),
        run_data.get("exit_code"),
        json.dumps(run_data.get("serial_logs", [])),
        json.dumps(run_data.get("test_results", [])),
        json.dumps(run_data.get("observations", [])),
        run_data.get("error_details"),
        json.dumps(run_data.get("setup_instructions", [])),
        run_data.get("started_at", ""),
        run_data.get("completed_at"),
        run_data.get("summary", "")
    ))
    conn.commit()
    conn.close()

def get_simulation_runs(project_id: str, version: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if version is not None:
        cursor.execute("SELECT * FROM simulation_runs WHERE project_id = ? AND version = ? ORDER BY started_at DESC", (project_id, version))
    else:
        cursor.execute("SELECT * FROM simulation_runs WHERE project_id = ? ORDER BY started_at DESC", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    
    runs = []
    for r in rows:
        d = dict(r)
        d["serial_logs"] = json.loads(d["serial_logs_json"]) if d.get("serial_logs_json") else []
        d["test_results"] = json.loads(d["test_results_json"]) if d.get("test_results_json") else []
        d["observations"] = json.loads(d["observations_json"]) if d.get("observations_json") else []
        d["setup_instructions"] = json.loads(d["setup_instructions_json"]) if d.get("setup_instructions_json") else []
        runs.append(d)
    return runs

# Component Catalog database methods
def upsert_catalog_entry(entry: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO component_catalog
        (part_id, canonical_name, manufacturer, model, category, board_compatibility_json,
         electrical_characteristics_json, pins_json, datasheet_url, source_metadata_json,
         image_url, image_attribution, wokwi_part_id, firmware_libraries_json, known_limitations_json,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(part_id) DO UPDATE SET
            canonical_name=excluded.canonical_name,
            manufacturer=excluded.manufacturer,
            model=excluded.model,
            category=excluded.category,
            board_compatibility_json=excluded.board_compatibility_json,
            electrical_characteristics_json=excluded.electrical_characteristics_json,
            pins_json=excluded.pins_json,
            datasheet_url=excluded.datasheet_url,
            source_metadata_json=excluded.source_metadata_json,
            image_url=excluded.image_url,
            image_attribution=excluded.image_attribution,
            wokwi_part_id=excluded.wokwi_part_id,
            firmware_libraries_json=excluded.firmware_libraries_json,
            known_limitations_json=excluded.known_limitations_json,
            updated_at=excluded.updated_at
    """, (
        entry["part_id"],
        entry.get("canonical_name", entry.get("display_name", entry["part_id"])),
        entry.get("manufacturer"),
        entry.get("model"),
        entry.get("category", "component"),
        json.dumps(entry.get("board_compatibility", [])),
        json.dumps(entry.get("electrical_characteristics", {})),
        json.dumps(entry.get("pins", {})),
        entry.get("datasheet_url"),
        json.dumps(entry.get("source_metadata", {})),
        entry.get("image_url"),
        entry.get("image_attribution"),
        entry.get("wokwi_part_id", entry.get("wokwi_type")),
        json.dumps(entry.get("firmware_libraries", [])),
        json.dumps(entry.get("known_limitations", [])),
        entry.get("created_at", ""),
        entry.get("updated_at", "")
    ))
    conn.commit()
    conn.close()

def get_all_catalog_entries(category: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if category:
        cursor.execute("SELECT * FROM component_catalog WHERE category = ? ORDER BY canonical_name ASC", (category,))
    else:
        cursor.execute("SELECT * FROM component_catalog ORDER BY category, canonical_name ASC")
    rows = cursor.fetchall()
    conn.close()

    entries = []
    for r in rows:
        d = dict(r)
        d["board_compatibility"] = json.loads(d["board_compatibility_json"]) if d.get("board_compatibility_json") else []
        d["electrical_characteristics"] = json.loads(d["electrical_characteristics_json"]) if d.get("electrical_characteristics_json") else {}
        d["pins"] = json.loads(d["pins_json"]) if d.get("pins_json") else {}
        d["source_metadata"] = json.loads(d["source_metadata_json"]) if d.get("source_metadata_json") else {}
        d["firmware_libraries"] = json.loads(d["firmware_libraries_json"]) if d.get("firmware_libraries_json") else []
        d["known_limitations"] = json.loads(d["known_limitations_json"]) if d.get("known_limitations_json") else []
        entries.append(d)
    return entries

def get_catalog_entry(part_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM component_catalog WHERE part_id = ?", (part_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["board_compatibility"] = json.loads(d["board_compatibility_json"]) if d.get("board_compatibility_json") else []
    d["electrical_characteristics"] = json.loads(d["electrical_characteristics_json"]) if d.get("electrical_characteristics_json") else {}
    d["pins"] = json.loads(d["pins_json"]) if d.get("pins_json") else {}
    d["source_metadata"] = json.loads(d["source_metadata_json"]) if d.get("source_metadata_json") else {}
    d["firmware_libraries"] = json.loads(d["firmware_libraries_json"]) if d.get("firmware_libraries_json") else []
    d["known_limitations"] = json.loads(d["known_limitations_json"]) if d.get("known_limitations_json") else []
    return d
