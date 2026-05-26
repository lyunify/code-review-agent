from fastapi import APIRouter, HTTPException

from app.db.database import AnalysisHistoryStore
from app.models.schemas import (
    AnalysisHistoryDetail,
    AnalysisHistoryResponse,
    AnalyzeRequest,
    AnalyzeResponse,
)
from app.services.action_plan import generate_action_plan
from app.services.analyzer import analyze_repository
from app.services.github_metadata import fetch_github_metadata
from app.services.mentor_agent import generate_mentor_feedback
from app.services.readiness import calculate_readiness
from app.services.repo_loader import clone_repository
from app.services.report_generator import generate_report

router = APIRouter(prefix="/api", tags=["analysis"])
history_store = AnalysisHistoryStore()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_repo(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        repo_path = clone_repository(str(request.repo_url))
        repo_url = str(request.repo_url).rstrip("/")
        analysis = analyze_repository(repo_path)
        github_metadata = fetch_github_metadata(repo_url)
        report = generate_report(analysis)
        readiness = calculate_readiness(analysis)
        action_plan = generate_action_plan(analysis=analysis, readiness=readiness)
        mentor_feedback = generate_mentor_feedback(repo_url=repo_url, analysis=analysis, readiness=readiness)
        history_store.save_analysis(
            repo_url=repo_url,
            analysis=analysis,
            report=report,
            readiness=readiness,
            mentor_feedback=mentor_feedback,
            action_plan=action_plan,
            github_metadata=github_metadata,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AnalyzeResponse(
        repo_url=repo_url,
        analysis=analysis,
        github_metadata=github_metadata,
        report=report,
        readiness=readiness,
        mentor_feedback=mentor_feedback,
        action_plan=action_plan,
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
