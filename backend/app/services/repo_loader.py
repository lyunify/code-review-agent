import logging
from pathlib import Path

from git import Repo

logger = logging.getLogger(__name__)


def clone_repository(repo_url: str, dest: Path) -> None:
    """Clone a public GitHub repository (shallow, depth=1) to dest.

    The caller is responsible for creating and cleaning up the parent
    temporary directory.
    """
    logger.info("Cloning repository: url=%s dest=%s", repo_url, dest)
    Repo.clone_from(repo_url, dest, depth=1)
    logger.info("Clone complete: dest=%s", dest)
