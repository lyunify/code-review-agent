import logging

from fastapi import APIRouter, HTTPException

from app.db.database import AnalysisHistoryStore
from app.jobs import create_job, get_job, start_analysis_thread
from app.models.schemas import (
    AnalysisHistoryDetail,
    AnalysisHistoryResponse,
    AnalyzeRequest,
    JobCreatedResponse,
    JobStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])
history_store = AnalysisHistoryStore()


@router.post("/analyze", response_model=JobCreatedResponse)
def analyze_repo(request: AnalyzeRequest) -> JobCreatedResponse:
    repo_url = str(request.repo_url).rstrip("/")
    job_id = create_job()
    logger.info("Job created: job_id=%s repo=%s", job_id, repo_url)
    start_analysis_thread(job_id=job_id, repo_url=repo_url, history_store=history_store)
    return JobCreatedResponse(job_id=job_id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str) -> JobStatusResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        result=job.result,
        error=job.error,
    )


@router.get("/history", response_model=AnalysisHistoryResponse)
def list_history() -> AnalysisHistoryResponse:
    return AnalysisHistoryResponse(records=history_store.list_recent(limit=10))


@router.get("/history/{record_id}", response_model=AnalysisHistoryDetail)
def get_history_record(record_id: int) -> AnalysisHistoryDetail:
    record = history_store.get_analysis(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="History record not found")
    return record
