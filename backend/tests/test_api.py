from pathlib import Path

from fastapi.testclient import TestClient

from app.db.database import AnalysisHistoryStore
from app.main import app
from app.models.schemas import GitHubMetadata


def test_analyze_endpoint_returns_report(monkeypatch, tmp_path: Path) -> None:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    (repo_dir / "README.md").write_text(
        "# Demo\n\n"
        "This tool helps students review GitHub projects before adding them to resumes.\n\n"
        "## Tech Stack\n\nPython and FastAPI.\n\n"
        "## Setup\n\nRun `pip install -r requirements.txt`.\n\n"
        "## Usage\n\nRun the app locally.\n\n"
        "## Demo\n\nSee screenshots in the docs.\n",
        encoding="utf-8",
    )
    (repo_dir / "requirements.txt").write_text("fastapi\n", encoding="utf-8")
    (repo_dir / ".gitignore").write_text(".venv/\n", encoding="utf-8")
    (repo_dir / ".env.example").write_text("API_KEY=\n", encoding="utf-8")
    (repo_dir / "docs").mkdir()
    (repo_dir / "docs" / "architecture.md").write_text("# Architecture\n", encoding="utf-8")
    (repo_dir / "frontend").mkdir()
    (repo_dir / "frontend" / "app.py").write_text("print('frontend')\n", encoding="utf-8")
    (repo_dir / "backend").mkdir()
    (repo_dir / "backend" / "app.py").write_text("print('backend')\n", encoding="utf-8")
    (repo_dir / "src").mkdir()
    (repo_dir / "src" / "main.py").write_text("print('hello')\n", encoding="utf-8")
    (repo_dir / "tests").mkdir()
    (repo_dir / "tests" / "test_main.py").write_text("def test_main():\n    assert True\n", encoding="utf-8")

    def fake_clone_repository(repo_url: str) -> Path:
        assert repo_url == "https://github.com/example/demo"
        return repo_dir

    monkeypatch.setattr("app.api.routes.clone_repository", fake_clone_repository)
    monkeypatch.setattr(
        "app.api.routes.fetch_github_metadata",
        lambda repo_url: GitHubMetadata(available=True, full_name="example/demo", license_spdx_id="MIT"),
    )
    monkeypatch.setattr("app.api.routes.history_store", AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"))

    client = TestClient(app)
    response = client.post("/api/analyze", json={"repo_url": "https://github.com/example/demo"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["repo_url"] == "https://github.com/example/demo"
    assert payload["analysis"]["total_files"] == 9
    assert "summary" in payload["report"]
    assert payload["readiness"]["score"] >= 90
    assert payload["readiness"]["status"] == "Resume-ready"
    assert "mentor_summary" in payload["mentor_feedback"]
    assert len(payload["mentor_feedback"]["resume_bullets"]) == 3
    assert len(payload["action_plan"]["items"]) >= 1
    assert payload["github_metadata"]["license_spdx_id"] == "MIT"


def test_history_endpoint_returns_saved_analysis(monkeypatch, tmp_path: Path) -> None:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    (repo_dir / "README.md").write_text("# Demo\n", encoding="utf-8")
    (repo_dir / "main.py").write_text("print('hello')\n", encoding="utf-8")

    def fake_clone_repository(repo_url: str) -> Path:
        return repo_dir

    monkeypatch.setattr("app.api.routes.clone_repository", fake_clone_repository)
    monkeypatch.setattr(
        "app.api.routes.fetch_github_metadata",
        lambda repo_url: GitHubMetadata(available=True, full_name="example/demo"),
    )
    monkeypatch.setattr("app.api.routes.history_store", AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"))

    client = TestClient(app)
    analyze_response = client.post("/api/analyze", json={"repo_url": "https://github.com/example/demo"})
    history_response = client.get("/api/history")

    assert analyze_response.status_code == 200
    assert history_response.status_code == 200
    payload = history_response.json()
    assert len(payload["records"]) == 1
    assert payload["records"][0]["repo_url"] == "https://github.com/example/demo"
    assert payload["records"][0]["total_files"] == 2


def test_history_detail_endpoint_returns_full_saved_report(monkeypatch, tmp_path: Path) -> None:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    (repo_dir / "README.md").write_text(
        "# Demo\n\n"
        "This repo helps students evaluate whether a project is ready for an internship resume.\n\n"
        "## Setup\n\nRun the backend.\n\n"
        "## Usage\n\nAnalyze a GitHub repository.\n",
        encoding="utf-8",
    )
    (repo_dir / "main.py").write_text("print('hello')\n", encoding="utf-8")

    def fake_clone_repository(repo_url: str) -> Path:
        return repo_dir

    monkeypatch.setattr("app.api.routes.clone_repository", fake_clone_repository)
    monkeypatch.setattr(
        "app.api.routes.fetch_github_metadata",
        lambda repo_url: GitHubMetadata(available=True, full_name="example/demo", topics=["fastapi"]),
    )
    monkeypatch.setattr("app.api.routes.history_store", AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"))

    client = TestClient(app)
    analyze_response = client.post("/api/analyze", json={"repo_url": "https://github.com/example/demo"})
    history_response = client.get("/api/history")
    record_id = history_response.json()["records"][0]["id"]
    detail_response = client.get(f"/api/history/{record_id}")

    assert analyze_response.status_code == 200
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["repo_url"] == "https://github.com/example/demo"
    assert payload["analysis"]["total_files"] == 2
    assert payload["report"]["summary"]
    assert payload["readiness"]["score"] > 0
    assert "mentor_summary" in payload["mentor_feedback"]
    assert len(payload["action_plan"]["items"]) >= 1
    assert payload["github_metadata"]["topics"] == ["fastapi"]


def test_history_detail_endpoint_returns_404_for_missing_record(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr("app.api.routes.history_store", AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"))

    client = TestClient(app)
    response = client.get("/api/history/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "History record not found"
