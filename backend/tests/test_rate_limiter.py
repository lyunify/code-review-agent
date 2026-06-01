from app.services.rate_limiter import RedisRateLimiter


class _FakeRedis:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}
        self.expirations: dict[str, int] = {}

    def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds


def test_redis_rate_limiter_allows_until_limit_then_blocks() -> None:
    limiter = RedisRateLimiter.__new__(RedisRateLimiter)
    fake_redis = _FakeRedis()
    limiter._redis = fake_redis
    limiter._limit = 2
    limiter._window_seconds = 60

    assert limiter.allow("user:1") is True
    assert limiter.allow("user:1") is True
    assert limiter.allow("user:1") is False
    assert fake_redis.expirations == {"rate-limit:analyze:user:1": 60}
