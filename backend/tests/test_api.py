import shutil
import time
from pathlib import Path

from fastapi.testclient import TestClient

from app.db.database import AnalysisHistoryStore
from app.main import app
from app.models.schemas import (
    ActionPlan,
    GitHubMetadata,
    MentorFeedback,
    RepositoryAnalysis,
    ResumeReadiness,
    ReviewReport,
)


def _make_repo(tmp_path: Path) -> Path:
    """Create a minimal fake repository directory with enough signal files."""
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
    (repo_dir / "tests" / "test_main.py").write_text(
        "def test_main():\n    assert True\n", encoding="utf-8"
    )
    return repo_dir


def _wait_for_job(client: TestClient, job_id: str, timeout: float = 5.0) -> dict:  # type: ignore[type-arg]
    """Poll GET /api/jobs/{job_id} until status is done or failed."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        r = client.get(f"/api/jobs/{job_id}")
        assert r.status_code == 200
        data = r.json()
        if data["status"] in ("done", "failed"):
            return data  # type: ignore[return-value]
        time.sleep(0.05)
    raise TimeoutError(f"Job {job_id} did not finish within {timeout}s")


def test_analyze_returns_job_id_immediately(monkeypatch, tmp_path: Path) -> None:
    repo_dir = _make_repo(tmp_path)
    monkeypatch.setattr(
        "app.jobs.clone_repository",
        lambda url, dest: shutil.copytree(repo_dir, dest),
    )
    monkeypatch.setattr(
        "app.jobs.fetch_github_metadata",
        lambda repo_url: GitHubMetadata(available=True, full_name="example/demo", license_spdx_id="MIT"),
    )
    monkeypatch.setattr("app.jobs.get_repo_size_kb", lambda repo_url: 1000)
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )

    client = TestClient(app)
    response = client.post("/api/analyze", json={"repo_url": "https://github.com/example/demo"})

    assert response.status_code == 200
    payload = response.json()
    assert "job_id" in payload
    assert len(payload["job_id"]) == 36  # UUID4


def test_analyze_rejects_non_github_urls(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )

    client = TestClient(app)
    response = client.post("/api/analyze", json={"repo_url": "https://example.com/demo"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Only public GitHub repository URLs are supported."


def test_health_live_returns_ok() -> None:
    client = TestClient(app)

    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_endpoint_lists_backend_entrypoints() -> None:
    client = TestClient(app)

    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "service": "Repo Ready API",
        "docs": "/docs",
        "health": {
            "live": "/health/live",
            "ready": "/health/ready",
        },
        "api": {
            "analyze": "/api/analyze",
            "jobs": "/api/jobs/{job_id}",
            "history": "/api/history",
        },
    }


def test_dev_login_me_and_logout_use_session_cookie(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )
    client = TestClient(app)

    login_response = client.post("/api/auth/dev-login", json={"username": "Katy"})
    assert login_response.status_code == 200
    assert login_response.json()["user"]["username"] == "katy"
    assert "repo_ready_session" in login_response.cookies

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user"]["username"] == "katy"

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json() == {"ok": True}
    assert client.get("/api/auth/me").json() == {"user": None}


def test_history_endpoint_is_scoped_to_current_user(monkeypatch, tmp_path: Path) -> None:
    db_store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")
    monkeypatch.setattr("app.api.routes.history_store", db_store)
    alice = db_store.create_or_get_dev_user("alice")
    bob = db_store.create_or_get_dev_user("bob")
    anonymous_record = _save_minimal_history(db_store, "https://github.com/example/public")
    alice_record = _save_minimal_history(
        db_store,
        "https://github.com/example/alice",
        user_id=alice.id,
    )
    bob_record = _save_minimal_history(
        db_store,
        "https://github.com/example/bob",
        user_id=bob.id,
    )

    anonymous_client = TestClient(app)
    anonymous_response = anonymous_client.get("/api/history")
    assert [record["id"] for record in anonymous_response.json()["records"]] == [
        anonymous_record.id
    ]

    alice_client = TestClient(app)
    alice_client.post("/api/auth/dev-login", json={"username": "alice"})
    alice_response = alice_client.get("/api/history")
    assert [record["id"] for record in alice_response.json()["records"]] == [
        alice_record.id
    ]
    assert alice_client.get(f"/api/history/{alice_record.id}").status_code == 200
    assert alice_client.get(f"/api/history/{bob_record.id}").status_code == 404


def test_health_ready_checks_database(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.main.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )
    monkeypatch.setattr("app.main.check_redis", lambda: True)
    client = TestClient(app)

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {
            "database": "ok",
            "redis": "ok",
        },
    }


def test_health_ready_returns_503_when_redis_is_unavailable(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.main.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )
    monkeypatch.setattr("app.main.check_redis", lambda: False)
    client = TestClient(app)

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["detail"] == {
        "status": "not_ready",
        "checks": {
            "database": "ok",
            "redis": "unavailable",
        },
    }


def test_job_status_completes_with_full_result(monkeypatch, tmp_path: Path) -> None:
    repo_dir = _make_repo(tmp_path)
    monkeypatch.setattr(
        "app.jobs.clone_repository",
        lambda url, dest: shutil.copytree(repo_dir, dest),
    )
    monkeypatch.setattr(
        "app.jobs.fetch_github_metadata",
        lambda repo_url: GitHubMetadata(available=True, full_name="example/demo", license_spdx_id="MIT"),
    )
    monkeypatch.setattr("app.jobs.get_repo_size_kb", lambda repo_url: 1000)
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )

    client = TestClient(app)
    job_id = client.post(
        "/api/analyze", json={"repo_url": "https://github.com/example/demo"}
    ).json()["job_id"]
    result = _wait_for_job(client, job_id)

    assert result["status"] == "done"
    assert result["result"]["repo_url"] == "https://github.com/example/demo"
    assert result["result"]["analysis"]["total_files"] >= 1
    assert result["result"]["readiness"]["score"] >= 90
    assert result["result"]["github_metadata"]["license_spdx_id"] == "MIT"


def test_job_status_is_scoped_to_current_user(monkeypatch, tmp_path: Path) -> None:
    db_store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")
    monkeypatch.setattr("app.api.routes.history_store", db_store)
    monkeypatch.setattr("app.api.routes.start_analysis_thread", lambda **kwargs: None)
    alice = TestClient(app)
    bob = TestClient(app)
    alice.post("/api/auth/dev-login", json={"username": "alice"})
    bob.post("/api/auth/dev-login", json={"username": "bob"})

    job_id = alice.post(
        "/api/analyze", json={"repo_url": "https://github.com/example/demo"}
    ).json()["job_id"]

    assert alice.get(f"/api/jobs/{job_id}").status_code == 200
    bob_response = bob.get(f"/api/jobs/{job_id}")
    assert bob_response.status_code == 404
    assert bob_response.json()["detail"] == "Job not found"


def test_job_fails_when_repo_too_large(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr("app.jobs.get_repo_size_kb", lambda repo_url: 200_000)
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )

    client = TestClient(app)
    job_id = client.post(
        "/api/analyze", json={"repo_url": "https://github.com/example/demo"}
    ).json()["job_id"]
    result = _wait_for_job(client, job_id)

    assert result["status"] == "failed"
    assert "too large" in result["error"].lower()


def test_get_unknown_job_returns_404(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )
    client = TestClient(app)
    response = client.get("/api/jobs/nonexistent-job-id")
    assert response.status_code == 404


def test_history_endpoint_saves_completed_job(monkeypatch, tmp_path: Path) -> None:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    (repo_dir / "README.md").write_text("# Demo\n", encoding="utf-8")
    (repo_dir / "main.py").write_text("print('hello')\n", encoding="utf-8")

    monkeypatch.setattr(
        "app.jobs.clone_repository",
        lambda url, dest: shutil.copytree(repo_dir, dest),
    )
    monkeypatch.setattr(
        "app.jobs.fetch_github_metadata",
        lambda repo_url: GitHubMetadata(available=True, full_name="example/demo"),
    )
    monkeypatch.setattr("app.jobs.get_repo_size_kb", lambda repo_url: 500)
    db_store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")
    monkeypatch.setattr("app.api.routes.history_store", db_store)

    client = TestClient(app)
    job_id = client.post(
        "/api/analyze", json={"repo_url": "https://github.com/example/demo"}
    ).json()["job_id"]
    _wait_for_job(client, job_id)

    history_response = client.get("/api/history")
    assert history_response.status_code == 200
    records = history_response.json()["records"]
    assert len(records) == 1
    assert records[0]["repo_url"] == "https://github.com/example/demo"


def test_history_detail_returns_404_for_missing_record(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.api.routes.history_store",
        AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db"),
    )
    client = TestClient(app)
    response = client.get("/api/history/999")
    assert response.status_code == 404


def _save_minimal_history(
    store: AnalysisHistoryStore,
    repo_url: str,
    user_id: int | None = None,
):
    return store.save_analysis(
        repo_url=repo_url,
        analysis=RepositoryAnalysis(
            total_files=1,
            total_directories=0,
            languages={"Python": 1},
            largest_files=[],
            risks=[],
            has_readme=True,
            has_tests=True,
        ),
        report=ReviewReport(summary=f"Scanned {repo_url}", recommendations=[]),
        readiness=ResumeReadiness(
            score=80,
            status="Almost ready",
            checklist=[],
            priority_fixes=[],
        ),
        mentor_feedback=MentorFeedback(
            mentor_summary="Almost ready.",
            resume_bullets=[],
            interview_questions=[],
            next_steps=[],
        ),
        action_plan=ActionPlan(items=[]),
        github_metadata=GitHubMetadata(available=True, full_name="example/demo"),
        user_id=user_id,
    )
