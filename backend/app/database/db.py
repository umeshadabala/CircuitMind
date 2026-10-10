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
            status TEXT NOT NULL,
            serial_logs_json TEXT,
            test_results_json TEXT,
            observations_json TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            summary TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)
    
    # Create indexes for fast lookup
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_project ON engineering_memory(project_id, event_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sim_project ON simulation_runs(project_id)")
    
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
        (id, project_id, version, status, serial_logs_json, test_results_json, observations_json, started_at, completed_at, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status=excluded.status,
            serial_logs_json=excluded.serial_logs_json,
            test_results_json=excluded.test_results_json,
            observations_json=excluded.observations_json,
            completed_at=excluded.completed_at,
            summary=excluded.summary
    """, (
        run_data["id"],
        run_data["project_id"],
        run_data.get("version", 1),
        run_data.get("status", "pending"),
        json.dumps(run_data.get("serial_logs", [])),
        json.dumps(run_data.get("test_results", [])),
        json.dumps(run_data.get("observations", [])),
        run_data.get("started_at", ""),
        run_data.get("completed_at"),
        run_data.get("summary", "")
    ))
    conn.commit()
    conn.close()

def get_simulation_runs(project_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM simulation_runs WHERE project_id = ? ORDER BY started_at DESC", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    
    runs = []
    for r in rows:
        d = dict(r)
        d["serial_logs"] = json.loads(d["serial_logs_json"]) if d.get("serial_logs_json") else []
        d["test_results"] = json.loads(d["test_results_json"]) if d.get("test_results_json") else []
        d["observations"] = json.loads(d["observations_json"]) if d.get("observations_json") else []
        runs.append(d)
    return runs
