from redis import Redis
from rq import Queue, Worker

from app.core.config import REDIS_URL

QUEUE_NAME = "analysis"


def get_queue() -> Queue:
    return Queue(QUEUE_NAME, connection=Redis.from_url(REDIS_URL))


def run_worker() -> None:
    Worker([get_queue()]).work()


if __name__ == "__main__":
    run_worker()
