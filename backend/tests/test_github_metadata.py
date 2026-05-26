from app.services.github_metadata import fetch_github_metadata, parse_github_repo


def test_parse_github_repo_accepts_common_github_urls() -> None:
    assert parse_github_repo("https://github.com/lyunify/code-review-agent") == (
        "lyunify",
        "code-review-agent",
    )
    assert parse_github_repo("https://github.com/lyunify/code-review-agent.git") == (
        "lyunify",
        "code-review-agent",
    )


def test_fetch_github_metadata_maps_api_response(monkeypatch) -> None:
    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "full_name": "lyunify/code-review-agent",
                "description": "Review repositories for internship resume readiness.",
                "topics": ["fastapi", "react", "ai"],
                "license": {"spdx_id": "MIT", "name": "MIT License"},
                "stargazers_count": 3,
                "forks_count": 1,
                "open_issues_count": 2,
                "default_branch": "main",
                "homepage": "https://example.com",
                "archived": False,
                "fork": False,
                "created_at": "2026-05-01T00:00:00Z",
                "updated_at": "2026-05-25T00:00:00Z",
                "pushed_at": "2026-05-25T00:00:00Z",
            }

    def fake_get(url: str, headers: dict[str, str], timeout: int) -> FakeResponse:
        assert url == "https://api.github.com/repos/lyunify/code-review-agent"
        assert headers["Accept"] == "application/vnd.github+json"
        assert timeout == 8
        return FakeResponse()

    monkeypatch.setattr("app.services.github_metadata.requests.get", fake_get)

    metadata = fetch_github_metadata("https://github.com/lyunify/code-review-agent")

    assert metadata.available is True
    assert metadata.full_name == "lyunify/code-review-agent"
    assert metadata.description == "Review repositories for internship resume readiness."
    assert metadata.topics == ["fastapi", "react", "ai"]
    assert metadata.license_spdx_id == "MIT"
    assert metadata.has_homepage is True
    assert metadata.is_fork is False


def test_fetch_github_metadata_falls_back_when_api_fails(monkeypatch) -> None:
    def fake_get(url: str, headers: dict[str, str], timeout: int) -> None:
        raise RuntimeError("network unavailable")

    monkeypatch.setattr("app.services.github_metadata.requests.get", fake_get)

    metadata = fetch_github_metadata("https://github.com/lyunify/code-review-agent")

    assert metadata.available is False
    assert metadata.full_name == "lyunify/code-review-agent"
    assert metadata.description is None
