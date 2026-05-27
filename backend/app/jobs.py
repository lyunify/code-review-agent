import logging
import tempfile
import threading
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from app.db.database import AnalysisHistoryStore
from app.models.schemas import AnalyzeResponse
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


def create_job() -> str:
    """Evict stale jobs, create a new pending job, return its job_id."""
    _evict_old_jobs()
    job_id = str(uuid.uuid4())
    _jobs[job_id] = JobState(job_id=job_id)
    return job_id


def get_job(job_id: str) -> JobState | None:
    return _jobs.get(job_id)


def start_analysis_thread(
    job_id: str, repo_url: str, history_store: AnalysisHistoryStore
) -> None:
    """Spawn a daemon thread to run the analysis for job_id."""
    thread = threading.Thread(
        target=_run_analysis,
        args=(job_id, repo_url, history_store),
        daemon=True,
    )
    thread.start()


def _run_analysis(
    job_id: str, repo_url: str, history_store: AnalysisHistoryStore
) -> None:
    job = _jobs[job_id]
    job.status = "running"
    try:
        job.progress = "Checking repository size..."
        size_kb = get_repo_size_kb(repo_url)
        if size_kb > _MAX_REPO_SIZE_KB:
            raise ValueError(
                f"Repository is too large ({size_kb // 1000} MB). "
                f"Maximum supported size is 150 MB."
            )

        job.progress = "Cloning repository..."
        with tempfile.TemporaryDirectory(prefix="code-review-agent-") as tmpdir:
            repo_path = Path(tmpdir) / "repo"
            clone_repository(repo_url, repo_path)

            job.progress = "Analyzing files..."
            analysis = analyze_repository(repo_path)
        # tmpdir is deleted here — analysis data is already in memory

        job.progress = "Fetching repository metadata..."
        github_metadata = fetch_github_metadata(repo_url)

        job.progress = "Computing readiness score..."
        report = generate_report(analysis)
        readiness = calculate_readiness(analysis)
        action_plan = generate_action_plan(analysis=analysis, readiness=readiness)

        job.progress = "Generating mentor feedback..."
        mentor_feedback = generate_mentor_feedback(
            repo_url=repo_url,
            analysis=analysis,
            readiness=readiness,
            github_metadata=github_metadata,
        )

        history_store.save_analysis(
            repo_url=repo_url,
            analysis=analysis,
            report=report,
            readiness=readiness,
            mentor_feedback=mentor_feedback,
            action_plan=action_plan,
            github_metadata=github_metadata,
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
