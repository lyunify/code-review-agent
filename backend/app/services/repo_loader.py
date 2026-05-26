import logging
from pathlib import Path
from tempfile import TemporaryDirectory

from git import Repo

logger = logging.getLogger(__name__)

_TEMP_DIRECTORIES: list[TemporaryDirectory[str]] = []


def clone_repository(repo_url: str) -> Path:
    logger.info("Cloning repository: url=%s", repo_url)
    temp_dir = TemporaryDirectory(prefix="code-review-agent-")
    _TEMP_DIRECTORIES.append(temp_dir)
    destination = Path(temp_dir.name) / "repo"
    Repo.clone_from(repo_url, destination, depth=1)
    logger.info("Clone complete: path=%s", destination)
    return destination
