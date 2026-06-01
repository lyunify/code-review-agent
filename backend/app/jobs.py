import logging
import tempfile
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol, cast

from app.core import config
from app.db.database import AnalysisHistoryStore, AnalysisJobRecord
from app.models.schemas import AnalysisHistoryDetail, AnalyzeResponse
from app.services.action_plan import generate_action_plan
from app.services.analyzer import analyze_repository
from app.services.github_metadata import fetch_github_metadata, get_repo_size_kb
from app.services.mentor_agent import generate_mentor_feedback
from app.services.readiness import calculate_readiness
from app.services.repo_loader import clone_repository
from app.services.report_generator import generate_report

logger = logging.getLogger(__name__)

_MAX_REPO_SIZE_KB = 150_000  # 150 MB
_JOB_TTL_SECONDS = 3600  # 1 hour


@dataclass
class JobState:
    job_id: str
    status: str = "pending"
    progress: str = "Queued..."
    result: AnalyzeResponse | None = None
    error: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


# Module-level job store. Dict operations are atomic on CPython (GIL), so
# no explicit lock is needed for simple get/set from multiple threads.
_jobs: dict[str, JobState] = {}


class QueueAdapter(Protocol):
    def enqueue(self, function: Callable[[str, str], None], *args: str) -> object:
        pass


def create_job(
    history_store: AnalysisHistoryStore,
    repo_url: str,
    user_id: int | None = None,
) -> str:
    """Evict stale in-memory results, persist a pending job, return its job_id."""
    _evict_old_jobs()
    record = history_store.create_job(repo_url, user_id=user_id)
    _jobs[record.job_id] = _state_from_record(record)
    return record.job_id


def get_job(job_id: str, history_store: AnalysisHistoryStore) -> JobState | None:
    record = history_store.get_job(job_id)
    if record is None:
        return None
    cached = _jobs.get(job_id)
    state = _state_from_record(record)
    if cached and cached.result is not None:
        state.result = cached.result
    elif record.result_history_id is not None:
        detail = history_store.get_analysis(record.result_history_id, user_id=record.user_id)
        if detail is not None:
            state.result = _response_from_history_detail(detail)
    _jobs[job_id] = state
    return state


def _state_from_record(record: AnalysisJobRecord) -> JobState:
    return JobState(
        job_id=record.job_id,
        status=record.status,
        progress=record.progress,
        error=record.error,
        created_at=record.created_at,
    )


def _response_from_history_detail(detail: AnalysisHistoryDetail) -> AnalyzeResponse:
    return AnalyzeResponse(
        repo_url=detail.repo_url,
        analysis=detail.analysis,
        github_metadata=detail.github_metadata,
        report=detail.report,
        readiness=detail.readiness,
        mentor_feedback=detail.mentor_feedback,
        action_plan=detail.action_plan,
    )


def start_analysis_thread(
    job_id: str, repo_url: str, history_store: AnalysisHistoryStore
) -> None:
    """Spawn a daemon thread to run the analysis for job_id."""
    if config.ANALYSIS_QUEUE_BACKEND == "redis":
        enqueue_analysis_job(job_id=job_id, repo_url=repo_url)
        return

    thread = threading.Thread(
        target=_run_analysis,
        args=(job_id, repo_url, history_store),
        daemon=True,
    )
    thread.start()


def enqueue_analysis_job(
    job_id: str,
    repo_url: str,
    queue: QueueAdapter | None = None,
) -> None:
    if queue is None:
        from app.worker import get_queue

        active_queue = cast(QueueAdapter, get_queue())
    else:
        active_queue = queue

    active_queue.enqueue(run_analysis_job, job_id, repo_url)


def run_analysis_job(job_id: str, repo_url: str) -> None:
    history_store = AnalysisHistoryStore()
    record = history_store.get_job(job_id)
    _jobs[job_id] = _state_from_record(record) if record else JobState(job_id=job_id)
    _run_analysis(job_id=job_id, repo_url=repo_url, history_store=history_store)


def _run_analysis(
    job_id: str, repo_url: str, history_store: AnalysisHistoryStore
) -> None:
    job = _jobs[job_id]
    job_record = history_store.get_job(job_id)
    user_id = job_record.user_id if job_record else None
    job.status = "running"
    history_store.mark_job_running(job_id, progress="Checking repository size...")
    try:
        _set_progress(job, history_store, "Checking repository size...")
        size_kb = get_repo_size_kb(repo_url)
        if size_kb > _MAX_REPO_SIZE_KB:
            raise ValueError(
                f"Repository is too large ({size_kb // 1000} MB). "
                f"Maximum supported size is 150 MB."
            )

        _set_progress(job, history_store, "Cloning repository...")
        with tempfile.TemporaryDirectory(prefix="code-review-agent-") as tmpdir:
            repo_path = Path(tmpdir) / "repo"
            clone_repository(repo_url, repo_path)

            _set_progress(job, history_store, "Analyzing files...")
            analysis = analyze_repository(repo_path)
        # tmpdir is deleted here — analysis data is already in memory

        _set_progress(job, history_store, "Fetching repository metadata...")
        github_metadata = fetch_github_metadata(repo_url)

        _set_progress(job, history_store, "Computing readiness score...")
        report = generate_report(analysis)
        readiness = calculate_readiness(analysis)
        action_plan = generate_action_plan(analysis=analysis, readiness=readiness)

        _set_progress(job, history_store, "Generating mentor feedback...")
        mentor_feedback = generate_mentor_feedback(
            repo_url=repo_url,
            analysis=analysis,
            readiness=readiness,
            github_metadata=github_metadata,
        )

        saved = history_store.save_analysis(
            repo_url=repo_url,
            analysis=analysis,
            report=report,
            readiness=readiness,
            mentor_feedback=mentor_feedback,
            action_plan=action_plan,
            github_metadata=github_metadata,
            user_id=user_id,
        )

        job.result = AnalyzeResponse(
            repo_url=repo_url,
            analysis=analysis,
            github_metadata=github_metadata,
            report=report,
            readiness=readiness,
            mentor_feedback=mentor_feedback,
            action_plan=action_plan,
        )
        job.status = "done"
        job.progress = "Done"
        history_store.mark_job_done(job_id, result_history_id=saved.id)
        logger.info(
            "Job complete: job_id=%s repo=%s score=%d",
            job_id,
            repo_url,
            readiness.score,
        )

    except Exception as exc:
        job.error = str(exc)
        job.status = "failed"
        job.progress = "Failed"
        history_store.mark_job_failed(job_id, error=str(exc))
        logger.error("Job failed: job_id=%s repo=%s error=%s", job_id, repo_url, exc)


def _evict_old_jobs() -> None:
    """Remove jobs older than 1 hour to prevent unbounded memory growth."""
    cutoff = datetime.now(UTC).timestamp() - _JOB_TTL_SECONDS
    stale = [
        jid
        for jid, job in _jobs.items()
        if datetime.fromisoformat(job.created_at).timestamp() < cutoff
    ]
    for jid in stale:
        _jobs.pop(jid, None)


def _set_progress(
    job: JobState, history_store: AnalysisHistoryStore, progress: str
) -> None:
    job.progress = progress
    history_store.update_job_progress(job.job_id, progress=progress)
