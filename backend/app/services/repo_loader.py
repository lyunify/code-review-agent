from pathlib import Path
from tempfile import TemporaryDirectory

from git import Repo

_TEMP_DIRECTORIES: list[TemporaryDirectory[str]] = []


def clone_repository(repo_url: str) -> Path:
    temp_dir = TemporaryDirectory(prefix="code-review-agent-")
    _TEMP_DIRECTORIES.append(temp_dir)
    destination = Path(temp_dir.name) / "repo"
    Repo.clone_from(repo_url, destination, depth=1)
    return destination
