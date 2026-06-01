import logging
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request, Response

from app.db.database import AnalysisHistoryStore, AnalysisJobRecord, UserRecord
from app.jobs import create_job, get_job, start_analysis_thread
from app.models.schemas import (
    AnalysisHistoryDetail,
    AnalysisHistoryResponse,
    AnalyzeRequest,
    CurrentUser,
    CurrentUserResponse,
    DevLoginRequest,
    JobCreatedResponse,
    JobEvent,
    JobEventsResponse,
    JobStatusResponse,
)
from app.services.rate_limiter import RedisRateLimiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])
history_store = AnalysisHistoryStore()
rate_limiter = RedisRateLimiter()
SESSION_COOKIE_NAME = "repo_ready_session"


def _current_user(request: Request) -> UserRecord | None:
    return history_store.get_user_by_session(request.cookies.get(SESSION_COOKIE_NAME))


def _current_user_id(request: Request) -> int | None:
    user = _current_user(request)
    return user.id if user else None


def _actor_for_request(request: Request, user: UserRecord | None = None) -> str:
    current = user if user is not None else _current_user(request)
    if current is not None:
        return f"user:{current.id}"
    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


def _current_user_response(user: UserRecord | None) -> CurrentUserResponse:
    if user is None:
        return CurrentUserResponse(user=None)
    return CurrentUserResponse(
        user=CurrentUser(
            id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
        )
    )


@router.post("/auth/dev-login", response_model=CurrentUserResponse)
def dev_login(
    request: DevLoginRequest,
    response: Response,
    http_request: Request,
) -> CurrentUserResponse:
    user = history_store.create_or_get_dev_user(request.username)
    session = history_store.create_session(user.id)
    history_store.record_audit_event(
        event_type="login",
        user_id=user.id,
        actor=_actor_for_request(http_request, user=user),
        metadata={"username": user.username},
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session.session_id,
        httponly=True,
        samesite="lax",
        max_age=14 * 24 * 60 * 60,
    )
    return _current_user_response(user)


@router.get("/auth/me", response_model=CurrentUserResponse)
def get_current_user(request: Request) -> CurrentUserResponse:
    return _current_user_response(_current_user(request))


@router.post("/auth/logout")
def logout(request: Request, response: Response) -> dict[str, bool]:
    user = _current_user(request)
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if session_id:
        history_store.delete_session(session_id)
    history_store.record_audit_event(
        event_type="logout",
        user_id=user.id if user else None,
        actor=_actor_for_request(request, user=user),
        metadata={},
    )
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"ok": True}


@router.post("/analyze", response_model=JobCreatedResponse)
def analyze_repo(request: AnalyzeRequest, http_request: Request) -> JobCreatedResponse:
    repo_url = str(request.repo_url).rstrip("/")
    user_id = _current_user_id(http_request)
    actor = _actor_for_request(http_request)
    if not _is_supported_github_url(repo_url):
        history_store.record_audit_event(
            event_type="analysis_rejected",
            user_id=user_id,
            actor=actor,
            metadata={"repo_url": repo_url, "reason": "unsupported_repo_host"},
        )
        raise HTTPException(
            status_code=400,
            detail="Only public GitHub repository URLs are supported.",
        )
    if not rate_limiter.allow(actor):
        history_store.record_audit_event(
            event_type="analysis_rejected",
            user_id=user_id,
            actor=actor,
            metadata={"repo_url": repo_url, "reason": "rate_limited"},
        )
        raise HTTPException(
            status_code=429,
            detail="Analyze rate limit exceeded. Please try again later.",
        )
    job_id = create_job(
        history_store=history_store,
        repo_url=repo_url,
        user_id=user_id,
    )
    history_store.record_audit_event(
        event_type="analysis_started",
        user_id=user_id,
        actor=actor,
        metadata={"repo_url": repo_url, "job_id": job_id},
    )
    logger.info("Job created: job_id=%s repo=%s", job_id, repo_url)
    start_analysis_thread(job_id=job_id, repo_url=repo_url, history_store=history_store)
    return JobCreatedResponse(job_id=job_id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, request: Request) -> JobStatusResponse:
    _get_owned_job_record_or_404(job_id=job_id, request=request)
    job = get_job(job_id, history_store=history_store)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        result=job.result,
        error=job.error,
    )


@router.get("/jobs/{job_id}/events", response_model=JobEventsResponse)
def get_job_events(job_id: str, request: Request) -> JobEventsResponse:
    _get_owned_job_record_or_404(job_id=job_id, request=request)
    return JobEventsResponse(
        events=[
            JobEvent(
                sequence=event.sequence,
                event_type=event.event_type,
                message=event.message,
                metadata=event.metadata,
                created_at=event.created_at,
            )
            for event in history_store.list_job_events(job_id)
        ]
    )


def _get_owned_job_record_or_404(job_id: str, request: Request) -> AnalysisJobRecord:
    record = history_store.get_job(job_id)
    current_user_id = _current_user_id(request)
    if record is None or record.user_id != current_user_id:
        if record is not None:
            history_store.record_audit_event(
                event_type="job_view_denied",
                user_id=current_user_id,
                actor=_actor_for_request(request),
                metadata={"job_id": job_id, "owner_user_id": record.user_id},
            )
        raise HTTPException(status_code=404, detail="Job not found")
    return record


def _is_supported_github_url(repo_url: str) -> bool:
    parsed = urlparse(repo_url)
    return parsed.scheme in {"http", "https"} and parsed.hostname == "github.com"


@router.get("/history", response_model=AnalysisHistoryResponse)
def list_history(request: Request) -> AnalysisHistoryResponse:
    return AnalysisHistoryResponse(
        records=history_store.list_recent(limit=10, user_id=_current_user_id(request))
    )


@router.get("/history/{record_id}", response_model=AnalysisHistoryDetail)
def get_history_record(record_id: int, request: Request) -> AnalysisHistoryDetail:
    record = history_store.get_analysis(record_id, user_id=_current_user_id(request))
    if record is None:
        raise HTTPException(status_code=404, detail="History record not found")
    return record
