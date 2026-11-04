import json
from datetime import datetime, timezone
from typing import List, Optional
from backend.app.domain.models import Project
from backend.app.storage.database import get_db_connection, init_db


class ProjectRepository:
    """SQLite-backed persistent repository for CircuitMind projects with revision control."""

    def __init__(self):
        init_db()

    def list_projects(self) -> List[Project]:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM projects ORDER BY updated_at DESC")
            rows = cursor.fetchall()
            projects = []
            for row in rows:
                data = json.loads(row["data_json"])
                projects.append(Project.model_validate(data))
            return projects
        finally:
            conn.close()

    def get_project(self, project_id: str) -> Optional[Project]:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = json.loads(row["data_json"])
            return Project.model_validate(data)
        finally:
            conn.close()

    def save_project(self, project: Project, increment_revision: bool = False) -> Project:
        if increment_revision:
            project.revision += 1
            # Mark or invalidate stale validation report if from older revision
            if project.validation_report and project.validation_report.revision < project.revision:
                project.validation_report = None
            if project.firmware and project.firmware.revision < project.revision:
                # Retain code but mark unverified for current revision
                project.firmware.compilation_status = f"Stale (Generated for Rev {project.firmware.revision}; Current Rev is {project.revision})"

        project.updated_at = datetime.now(timezone.utc).isoformat()
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO projects (id, name, description, target_board, revision, created_at, updated_at, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    target_board = excluded.target_board,
                    revision = excluded.revision,
                    updated_at = excluded.updated_at,
                    data_json = excluded.data_json;
                """,
                (
                    project.id,
                    project.name,
                    project.description,
                    project.target_board,
                    project.revision,
                    project.created_at,
                    project.updated_at,
                    project.model_dump_json(),
                ),
            )
            conn.commit()
            return project
        finally:
            conn.close()

    def delete_project(self, project_id: str) -> bool:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
