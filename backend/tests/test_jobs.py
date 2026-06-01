from app.jobs import enqueue_analysis_job, run_analysis_job


class FakeQueue:
    def __init__(self) -> None:
        self.function = None
        self.args = ()

    def enqueue(self, function, *args):  # type: ignore[no-untyped-def]
        self.function = function
        self.args = args


def test_enqueue_analysis_job_uses_queue_adapter() -> None:
    queue = FakeQueue()

    enqueue_analysis_job(
        job_id="job-123",
        repo_url="https://github.com/example/demo",
        queue=queue,
    )

    assert queue.function is run_analysis_job
    assert queue.args == ("job-123", "https://github.com/example/demo")
