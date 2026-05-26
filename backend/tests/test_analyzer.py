from pathlib import Path

from app.services.analyzer import analyze_repository


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_analyze_repository_counts_languages_and_files(tmp_path: Path) -> None:
    write_file(
        tmp_path / "README.md",
        "# Demo\n\nA tool that helps students review projects.\n\n"
        "## Tech Stack\n\nPython and JavaScript.\n\n"
        "## Setup\n\nRun `pip install -r requirements.txt`.\n\n"
        "## Demo\n\nSee screenshots below.\n",
    )
    write_file(tmp_path / "requirements.txt", "fastapi\n")
    write_file(tmp_path / ".gitignore", ".venv/\n")
    write_file(tmp_path / ".env.example", "API_KEY=\n")
    write_file(tmp_path / "LICENSE", "MIT License\n")
    write_file(tmp_path / ".github" / "workflows" / "ci.yml", "name: CI\n")
    write_file(tmp_path / "Dockerfile", "FROM python:3.12\n")
    write_file(tmp_path / "render.yaml", "services: []\n")
    write_file(tmp_path / "docs" / "architecture.md", "# Architecture\n")
    write_file(tmp_path / "docs" / "api.md", "# API\n\nGET /health\nPOST /api/analyze\n")
    write_file(tmp_path / "frontend" / "app.py", "print('frontend')\n")
    write_file(tmp_path / "frontend" / "api.ts", "fetch('http://127.0.0.1:8000/api/analyze')\n")
    write_file(tmp_path / "backend" / "app.py", "print('backend')\n")
    write_file(tmp_path / "src" / "main.py", "print('hello')\n")
    write_file(tmp_path / "web" / "app.js", "console.log('hello');\n")
    write_file(tmp_path / "tests" / "test_main.py", "def test_main():\n    assert True\n")

    result = analyze_repository(tmp_path)

    assert result.total_files == 16
    assert result.total_directories == 8
    assert result.languages["Python"] == 4
    assert result.languages["JavaScript"] == 1
    assert result.has_readme is True
    assert result.has_tests is True
    assert result.has_dependency_file is True
    assert result.has_docs is True
    assert result.has_frontend_backend_structure is True
    assert result.has_license is True
    assert result.has_ci_config is True
    assert result.has_deployment_config is True
    assert result.has_api_documentation is True
    assert result.has_frontend_backend_integration is True
    assert result.readme_has_project_purpose is True
    assert result.readme_has_tech_stack is True
    assert result.readme_has_demo_assets is True


def test_analyze_repository_flags_missing_project_hygiene(tmp_path: Path) -> None:
    write_file(tmp_path / "src" / "main.py", "\n".join(["print('x')"] * 350))

    result = analyze_repository(tmp_path)

    risk_messages = [risk.message for risk in result.risks]
    assert "Repository does not contain a README file." in risk_messages
    assert "Repository does not appear to contain tests." in risk_messages
    assert any("Long file detected" in message for message in risk_messages)
