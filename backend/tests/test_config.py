from app.core.config import _parse_origins


def test_parse_origins_splits_comma_separated() -> None:
    result = _parse_origins("https://example.vercel.app,https://example.com")
    assert result == ["https://example.vercel.app", "https://example.com"]


def test_parse_origins_trims_whitespace() -> None:
    result = _parse_origins(" https://a.com , https://b.com ")
    assert result == ["https://a.com", "https://b.com"]


def test_parse_origins_skips_empty_segments() -> None:
    result = _parse_origins("https://a.com,,https://b.com,")
    assert result == ["https://a.com", "https://b.com"]


def test_parse_origins_single_origin() -> None:
    result = _parse_origins("https://a.com")
    assert result == ["https://a.com"]
