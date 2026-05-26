from fastapi import APIRouter, HTTPException

from app.db.database import AnalysisHistoryStore
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, AnalysisHistoryDetail, AnalysisHistoryResponse
from app.services.analyzer import analyze_repository
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
        analysis = analyze_repository(repo_path)
        report = generate_report(analysis)
        readiness = calculate_readiness(analysis)
        repo_url = str(request.repo_url).rstrip("/")
        mentor_feedback = generate_mentor_feedback(repo_url=repo_url, analysis=analysis, readiness=readiness)
        history_store.save_analysis(
            repo_url=repo_url,
            analysis=analysis,
            report=report,
            readiness=readiness,
            mentor_feedback=mentor_feedback,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AnalyzeResponse(
        repo_url=repo_url,
        analysis=analysis,
        report=report,
        readiness=readiness,
        mentor_feedback=mentor_feedback,
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
