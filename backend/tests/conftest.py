import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.storage.database import init_db
from backend.app.storage.repository import ProjectRepository


@pytest.fixture(autouse=True)
def isolate_test_db(tmp_path, monkeypatch):
    """Automatically isolates every test to a temporary database so production DB is never touched."""
    test_db = str(tmp_path / "isolated_test.db")
    monkeypatch.setenv("CIRCUITMIND_DB", test_db)
    init_db()


@pytest.fixture
def clean_repo(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_suite.db")
    monkeypatch.setenv("CIRCUITMIND_DB", db_path)
    init_db()
    return ProjectRepository()


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_api.db")
    monkeypatch.setenv("CIRCUITMIND_DB", test_db)
    init_db()
    return TestClient(app)
