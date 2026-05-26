from pathlib import Path

from app.services.analyzer import analyze_repository


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_analyze_repository_counts_languages_and_files(tmp_path: Path) -> None:
    write_file(tmp_path / "README.md", "# Demo\n")
    write_file(tmp_path / "src" / "main.py", "print('hello')\n")
    write_file(tmp_path / "web" / "app.js", "console.log('hello');\n")
    write_file(tmp_path / "tests" / "test_main.py", "def test_main():\n    assert True\n")

    result = analyze_repository(tmp_path)

    assert result.total_files == 4
    assert result.total_directories == 3
    assert result.languages["Python"] == 2
    assert result.languages["JavaScript"] == 1
    assert result.has_readme is True
    assert result.has_tests is True


def test_analyze_repository_flags_missing_project_hygiene(tmp_path: Path) -> None:
    write_file(tmp_path / "src" / "main.py", "\n".join(["print('x')"] * 350))

    result = analyze_repository(tmp_path)

    risk_messages = [risk.message for risk in result.risks]
    assert "Repository does not contain a README file." in risk_messages
    assert "Repository does not appear to contain tests." in risk_messages
    assert any("Long file detected" in message for message in risk_messages)
