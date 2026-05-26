from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_analyze_endpoint_returns_report(monkeypatch, tmp_path: Path) -> None:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    (repo_dir / "README.md").write_text("# Demo\n", encoding="utf-8")
    (repo_dir / "main.py").write_text("print('hello')\n", encoding="utf-8")
    (repo_dir / "test_main.py").write_text("def test_main():\n    assert True\n", encoding="utf-8")

    def fake_clone_repository(repo_url: str) -> Path:
        assert repo_url == "https://github.com/example/demo"
        return repo_dir

    monkeypatch.setattr("app.api.routes.clone_repository", fake_clone_repository)

    client = TestClient(app)
    response = client.post("/api/analyze", json={"repo_url": "https://github.com/example/demo"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["repo_url"] == "https://github.com/example/demo"
    assert payload["analysis"]["total_files"] == 3
    assert "summary" in payload["report"]
