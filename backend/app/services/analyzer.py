from collections import Counter
from pathlib import Path

from app.core.config import (
    LANGUAGE_BY_EXTENSION,
    LONG_FILE_LINE_THRESHOLD,
    MAX_FILE_BYTES_TO_READ,
    MAX_LARGEST_FILES,
    is_ignored_path,
)
from app.models.schemas import FileMetric, RepositoryAnalysis, RiskSignal


def analyze_repository(repo_path: Path) -> RepositoryAnalysis:
    root = Path(repo_path)
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Repository path does not exist or is not a directory: {root}")

    files: list[FileMetric] = []
    languages: Counter[str] = Counter()
    directory_paths: set[Path] = set()
    has_readme = False
    has_tests = False
    has_gitignore = False
    has_env_example = False
    readme_has_setup = False
    readme_has_usage = False
    readme_has_project_purpose = False
    readme_has_tech_stack = False
    readme_has_demo_assets = False
    has_dependency_file = False
    has_docs = False
    top_level_directories: set[str] = set()

    for path in root.rglob("*"):
        relative_path = path.relative_to(root)
        if is_ignored_path(relative_path):
            continue

        if path.is_dir():
            directory_paths.add(relative_path)
            if len(relative_path.parts) == 1:
                top_level_directories.add(relative_path.parts[0].lower())
            if _looks_like_test_path(relative_path):
                has_tests = True
            continue

        if not path.is_file():
            continue

        language = _detect_language(path)
        line_count = _count_lines(path)
        size_bytes = path.stat().st_size
        file_metric = FileMetric(
            path=relative_path.as_posix(),
            size_bytes=size_bytes,
            lines=line_count,
            language=language,
        )
        files.append(file_metric)
        languages[language] += 1

        if _looks_like_readme(path.name):
            has_readme = True
            readme_text = _read_small_text_file(path)
            readme_has_setup = readme_has_setup or _contains_setup_instructions(readme_text)
            readme_has_usage = readme_has_usage or _contains_usage_instructions(readme_text)
            readme_has_project_purpose = readme_has_project_purpose or _contains_project_purpose(readme_text)
            readme_has_tech_stack = readme_has_tech_stack or _contains_tech_stack(readme_text)
            readme_has_demo_assets = readme_has_demo_assets or _contains_demo_assets(readme_text)
        if _looks_like_test_path(relative_path):
            has_tests = True
        if path.name == ".gitignore":
            has_gitignore = True
        if path.name in {".env.example", ".env.sample", "env.example"}:
            has_env_example = True
        if _looks_like_dependency_file(path.name):
            has_dependency_file = True
        if relative_path.parts and relative_path.parts[0].lower() == "docs":
            has_docs = True

    largest_files = sorted(files, key=lambda file: file.size_bytes, reverse=True)[:MAX_LARGEST_FILES]
    risks = _build_risks(files=files, has_readme=has_readme, has_tests=has_tests)
    has_frontend_backend_structure = {"frontend", "backend"}.issubset(top_level_directories)

    return RepositoryAnalysis(
        total_files=len(files),
        total_directories=len(directory_paths),
        languages=dict(sorted(languages.items())),
        largest_files=largest_files,
        risks=risks,
        has_readme=has_readme,
        has_tests=has_tests,
        has_gitignore=has_gitignore,
        has_env_example=has_env_example,
        readme_has_setup=readme_has_setup,
        readme_has_usage=readme_has_usage,
        readme_has_project_purpose=readme_has_project_purpose,
        readme_has_tech_stack=readme_has_tech_stack,
        readme_has_demo_assets=readme_has_demo_assets,
        has_dependency_file=has_dependency_file,
        has_docs=has_docs,
        has_frontend_backend_structure=has_frontend_backend_structure,
    )


def _detect_language(path: Path) -> str:
    return LANGUAGE_BY_EXTENSION.get(path.suffix.lower(), "Other")


def _count_lines(path: Path) -> int:
    if path.stat().st_size > MAX_FILE_BYTES_TO_READ:
        return 0

    try:
        return len(path.read_text(encoding="utf-8", errors="ignore").splitlines())
    except OSError:
        return 0


def _read_small_text_file(path: Path) -> str:
    if path.stat().st_size > MAX_FILE_BYTES_TO_READ:
        return ""

    try:
        return path.read_text(encoding="utf-8", errors="ignore").lower()
    except OSError:
        return ""


def _looks_like_readme(file_name: str) -> bool:
    return file_name.lower().startswith("readme")


def _contains_setup_instructions(text: str) -> bool:
    setup_markers = [
        "installation",
        "install",
        "setup",
        "getting started",
        "how to run",
        "local setup",
        "pip install",
        "npm install",
    ]
    return any(marker in text for marker in setup_markers)


def _contains_usage_instructions(text: str) -> bool:
    usage_markers = [
        "usage",
        "demo",
        "example",
        "screenshot",
        "run",
        "uvicorn",
        "streamlit",
        "python ",
    ]
    return any(marker in text for marker in usage_markers)


def _contains_project_purpose(text: str) -> bool:
    purpose_markers = [
        "purpose",
        "overview",
        "problem",
        "helps",
        "built to",
        "designed to",
        "this project",
        "this app",
        "this tool",
    ]
    return any(marker in text for marker in purpose_markers)


def _contains_tech_stack(text: str) -> bool:
    tech_markers = [
        "tech stack",
        "technologies",
        "built with",
        "fastapi",
        "streamlit",
        "react",
        "python",
        "sqlite",
        "postgres",
        "typescript",
    ]
    return any(marker in text for marker in tech_markers)


def _contains_demo_assets(text: str) -> bool:
    demo_markers = [
        "screenshot",
        "screenshots",
        "demo",
        "gif",
        "video",
        "preview",
    ]
    return any(marker in text for marker in demo_markers)


def _looks_like_dependency_file(file_name: str) -> bool:
    return file_name.lower() in {
        "requirements.txt",
        "pyproject.toml",
        "poetry.lock",
        "pipfile",
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "go.mod",
        "pom.xml",
        "build.gradle",
        "cargo.toml",
    }


def _looks_like_test_path(relative_path: Path) -> bool:
    parts = {part.lower() for part in relative_path.parts}
    name = relative_path.name.lower()
    return (
        "test" in parts
        or "tests" in parts
        or name.startswith("test_")
        or name.endswith("_test.py")
        or name.endswith(".test.js")
        or name.endswith(".spec.js")
        or name.endswith(".test.ts")
        or name.endswith(".spec.ts")
    )


def _build_risks(
    files: list[FileMetric],
    has_readme: bool,
    has_tests: bool,
) -> list[RiskSignal]:
    risks: list[RiskSignal] = []

    if not has_readme:
        risks.append(
            RiskSignal(
                severity="medium",
                message="Repository does not contain a README file.",
            )
        )

    if not has_tests:
        risks.append(
            RiskSignal(
                severity="high",
                message="Repository does not appear to contain tests.",
            )
        )

    for file in files:
        if file.lines > LONG_FILE_LINE_THRESHOLD:
            risks.append(
                RiskSignal(
                    severity="medium",
                    message=f"Long file detected ({file.lines} lines).",
                    path=file.path,
                )
            )

    return risks
