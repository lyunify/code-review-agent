import logging
from urllib.parse import urlparse

import requests

from app.models.schemas import GitHubMetadata

logger = logging.getLogger(__name__)


def parse_github_repo(repo_url: str) -> tuple[str, str]:
    parsed = urlparse(repo_url)
    if parsed.netloc.lower() != "github.com":
        raise ValueError("Only GitHub repository URLs are supported for metadata lookup.")

    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) < 2:
        raise ValueError("GitHub repository URL must include owner and repository name.")

    owner = parts[0]
    repo = parts[1].removesuffix(".git")
    return owner, repo


def get_repo_size_kb(repo_url: str) -> int:
    """Return the repository size in KB from the GitHub API, or 0 if unavailable."""
    try:
        owner, repo = parse_github_repo(repo_url)
        response = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=8,
        )
        response.raise_for_status()
        return int(response.json().get("size", 0))
    except Exception as exc:
        logger.warning("Could not retrieve repo size for %s: %s", repo_url, exc)
        return 0


def fetch_github_metadata(repo_url: str) -> GitHubMetadata:
    owner, repo = parse_github_repo(repo_url)
    full_name = f"{owner}/{repo}"
    logger.info("Fetching GitHub metadata: repo=%s", full_name)

    try:
        response = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        logger.warning("GitHub metadata unavailable: repo=%s error=%s", full_name, exc)
        return GitHubMetadata(available=False, full_name=full_name)

    license_payload = payload.get("license") or {}
    homepage = payload.get("homepage") or None

    logger.info("GitHub metadata fetched: repo=%s stars=%d forks=%d", full_name, payload.get("stargazers_count", 0), payload.get("forks_count", 0))
    return GitHubMetadata(
        available=True,
        full_name=payload.get("full_name") or full_name,
        description=payload.get("description"),
        topics=payload.get("topics") or [],
        license_name=license_payload.get("name"),
        license_spdx_id=license_payload.get("spdx_id"),
        stars=payload.get("stargazers_count") or 0,
        forks=payload.get("forks_count") or 0,
        open_issues=payload.get("open_issues_count") or 0,
        default_branch=payload.get("default_branch"),
        homepage=homepage,
        has_homepage=bool(homepage),
        is_archived=payload.get("archived") or False,
        is_fork=payload.get("fork") or False,
        created_at=payload.get("created_at"),
        updated_at=payload.get("updated_at"),
        pushed_at=payload.get("pushed_at"),
    )
