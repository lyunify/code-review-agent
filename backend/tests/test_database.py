from pathlib import Path

from app.db.database import AnalysisHistoryStore
from app.models.schemas import (
    ActionPlan,
    ActionPlanItem,
    MentorFeedback,
    ReadinessChecklistItem,
    RepositoryAnalysis,
    ResumeReadiness,
    ReviewReport,
)


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
    readiness = ResumeReadiness(
        score=90,
        status="Resume-ready",
        checklist=[
            ReadinessChecklistItem(
                name="README exists",
                passed=True,
                points=10,
                recommendation="Keep the README clear and current.",
            )
        ],
        priority_fixes=["Add a demo screenshot."],
    )
    mentor_feedback = MentorFeedback(
        mentor_summary="This project is close to resume-ready.",
        resume_bullets=["Built a Python repository analyzer."],
        interview_questions=["How does the analyzer score projects?"],
        next_steps=["Add screenshots."],
    )
    action_plan = ActionPlan(
        items=[
            ActionPlanItem(
                title="Add screenshots",
                category="Presentation",
                why_it_matters="Screenshots make the project easier to inspect.",
                how_to_improve="Capture the dashboard.",
                resume_impact="Makes the repo portfolio-ready.",
            )
        ]
    )

    saved = store.save_analysis(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        report=report,
        readiness=readiness,
        mentor_feedback=mentor_feedback,
        action_plan=action_plan,
    )
    records = store.list_recent(limit=5)
    detail = store.get_analysis(saved.id)

    assert saved.id == 1
    assert len(records) == 1
    assert records[0].repo_url == "https://github.com/example/demo"
    assert records[0].total_files == 3
    assert records[0].risk_count == 0
    assert records[0].summary == "Scanned 3 files across 1 directories."
    assert detail is not None
    assert detail.repo_url == "https://github.com/example/demo"
    assert detail.analysis.total_files == 3
    assert detail.readiness.score == 90
    assert detail.mentor_feedback.resume_bullets == ["Built a Python repository analyzer."]
    assert detail.action_plan.items[0].title == "Add screenshots"
