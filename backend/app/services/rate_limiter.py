import logging
from typing import cast

from redis import Redis

from app.core import config

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    def __init__(
        self,
        redis_url: str = config.REDIS_URL,
        limit: int = config.ANALYZE_RATE_LIMIT,
        window_seconds: int = config.ANALYZE_RATE_LIMIT_WINDOW_SECONDS,
    ) -> None:
        self._redis = Redis.from_url(redis_url)
        self._limit = limit
        self._window_seconds = window_seconds

    def allow(self, subject: str) -> bool:
        key = f"rate-limit:analyze:{subject}"
        try:
            count = cast(int, self._redis.incr(key))
            if count == 1:
                self._redis.expire(key, self._window_seconds)
            return count <= self._limit
        except Exception as exc:
            logger.warning("Rate limiter unavailable, allowing request: %s", exc)
            return True
