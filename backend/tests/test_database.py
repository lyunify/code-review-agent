from pathlib import Path

from app.db.database import AnalysisHistoryStore
from app.models.schemas import RepositoryAnalysis, ReviewReport


def test_history_store_saves_and_lists_analysis_records(tmp_path: Path) -> None:
    store = AnalysisHistoryStore(tmp_path / "history.db")
    analysis = RepositoryAnalysis(
        total_files=3,
        total_directories=1,
        languages={"Python": 2, "Markdown": 1},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=True,
    )
    report = ReviewReport(
        summary="Scanned 3 files across 1 directories.",
        recommendations=["Project hygiene looks solid for this first-pass scan."],
    )

    saved = store.save_analysis(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        report=report,
    )
    records = store.list_recent(limit=5)

    assert saved.id == 1
    assert len(records) == 1
    assert records[0].repo_url == "https://github.com/example/demo"
    assert records[0].total_files == 3
    assert records[0].risk_count == 0
    assert records[0].summary == "Scanned 3 files across 1 directories."
