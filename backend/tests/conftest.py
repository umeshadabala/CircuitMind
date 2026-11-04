import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.storage.repository import ProjectRepository


@pytest.fixture
def clean_repo(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_suite.db")
    monkeypatch.setenv("CIRCUITMIND_DB", db_path)
    return ProjectRepository()


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = str(tmp_path / "test_api.db")
    monkeypatch.setenv("CIRCUITMIND_DB", test_db)
    return TestClient(app)

