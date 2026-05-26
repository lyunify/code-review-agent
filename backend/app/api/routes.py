from fastapi import APIRouter, HTTPException

from app.db.database import AnalysisHistoryStore
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, AnalysisHistoryResponse
from app.services.analyzer import analyze_repository
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
        repo_url = str(request.repo_url).rstrip("/")
        history_store.save_analysis(repo_url=repo_url, analysis=analysis, report=report)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AnalyzeResponse(
        repo_url=repo_url,
        analysis=analysis,
        report=report,
    )


@router.get("/history", response_model=AnalysisHistoryResponse)
def list_history() -> AnalysisHistoryResponse:
    return AnalysisHistoryResponse(records=history_store.list_recent(limit=10))
