import os
from pathlib import Path

IGNORED_DIRECTORIES = {
    ".git",
    ".hg",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    "node_modules",
    "venv",
}

LANGUAGE_BY_EXTENSION = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".go": "Go",
    ".rb": "Ruby",
    ".rs": "Rust",
    ".c": "C",
    ".h": "C/C++",
    ".cpp": "C++",
    ".cc": "C++",
    ".cs": "C#",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".html": "HTML",
    ".css": "CSS",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".json": "JSON",
    ".toml": "TOML",
}

MAX_LARGEST_FILES = 5
LONG_FILE_LINE_THRESHOLD = 300
MAX_FILE_BYTES_TO_READ = 200_000


def is_ignored_path(path: Path) -> bool:
    return any(part in IGNORED_DIRECTORIES for part in path.parts)


DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./analysis_history.db")
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ANALYSIS_QUEUE_BACKEND: str = os.getenv("ANALYSIS_QUEUE_BACKEND", "thread")


def _parse_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


ALLOWED_ORIGINS: list[str] = _parse_origins(
    os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
)
