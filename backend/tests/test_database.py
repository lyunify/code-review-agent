from pathlib import Path

from sqlalchemy import create_engine, inspect

from alembic import command
from alembic.config import Config
from app.db.database import AnalysisHistoryStore
from app.models.schemas import (
    ActionPlan,
    ActionPlanItem,
    GitHubMetadata,
    MentorFeedback,
    ReadinessChecklistItem,
    RepositoryAnalysis,
    ResumeReadiness,
    ReviewReport,
)


def test_history_store_saves_and_lists_analysis_records(tmp_path: Path) -> None:
    store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")
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
        interview_questions=[{"question": "How does the analyzer score projects?", "situation": "S", "task": "T", "action": "A", "result": "R"}],
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
    github_metadata = GitHubMetadata(
        available=True,
        full_name="example/demo",
        description="Demo repository",
        topics=["python"],
        license_spdx_id="MIT",
    )

    saved = store.save_analysis(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        report=report,
        readiness=readiness,
        mentor_feedback=mentor_feedback,
        action_plan=action_plan,
        github_metadata=github_metadata,
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
    assert detail.github_metadata.full_name == "example/demo"
    assert detail.github_metadata.license_spdx_id == "MIT"


def test_get_analysis_returns_none_for_missing_id(tmp_path: Path) -> None:
    store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")
    result = store.get_analysis(9999)
    assert result is None


def test_job_store_persists_status_transitions(tmp_path: Path) -> None:
    store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")

    created = store.create_job("https://github.com/example/demo")
    running = store.mark_job_running(created.job_id, progress="Cloning repository...")
    done = store.mark_job_done(created.job_id, result_history_id=42)
    fetched = store.get_job(created.job_id)

    assert created.repo_url == "https://github.com/example/demo"
    assert created.status == "pending"
    assert created.progress == "Queued..."
    assert running is not None
    assert running.status == "running"
    assert running.progress == "Cloning repository..."
    assert done is not None
    assert done.status == "done"
    assert done.progress == "Done"
    assert done.result_history_id == 42
    assert fetched is not None
    assert fetched.status == "done"
    assert fetched.result_history_id == 42


def test_job_store_persists_failed_status(tmp_path: Path) -> None:
    store = AnalysisHistoryStore(f"sqlite:///{tmp_path}/history.db")

    created = store.create_job("https://github.com/example/demo")
    failed = store.mark_job_failed(created.job_id, error="Repository is too large")
    fetched = store.get_job(created.job_id)

    assert failed is not None
    assert failed.status == "failed"
    assert failed.progress == "Failed"
    assert failed.error == "Repository is too large"
    assert fetched is not None
    assert fetched.status == "failed"
    assert fetched.error == "Repository is too large"


def test_alembic_initial_schema_creates_tables(tmp_path: Path) -> None:
    db_url = f"sqlite:///{tmp_path}/migration.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(config, "head")

    engine = create_engine(db_url)
    tables = set(inspect(engine).get_table_names())
    assert {"analysis_history", "analysis_jobs", "alembic_version"}.issubset(tables)
