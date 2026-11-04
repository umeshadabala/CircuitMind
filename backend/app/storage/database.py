import os
import sqlite3
from typing import Optional

def get_db_file() -> str:
    return os.getenv("CIRCUITMIND_DB", "circuitmind.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_file())
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            target_board TEXT NOT NULL,
            revision INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            data_json TEXT NOT NULL
        );
        """
    )
    return conn


def init_db() -> None:
    """Initializes SQLite schema if not already created."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                target_board TEXT NOT NULL,
                revision INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                data_json TEXT NOT NULL
            );
            """
        )
        conn.commit()
    finally:
        conn.close()
