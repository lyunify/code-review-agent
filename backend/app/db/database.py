import logging
from datetime import UTC, datetime

from sqlalchemy import create_engine, desc, select
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL
from app.db.models import AnalysisHistoryRow, Base
from app.models.schemas import (
    ActionPlan,
    AnalysisHistoryDetail,
    AnalysisHistoryRecord,
    GitHubMetadata,
    MentorFeedback,
    RepositoryAnalysis,
    ResumeReadiness,
    ReviewReport,
)

logger = logging.getLogger(__name__)


class AnalysisHistoryStore:
    def __init__(self, db_url: str = DATABASE_URL) -> None:
        connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        self._engine = create_engine(db_url, connect_args=connect_args)
        Base.metadata.create_all(self._engine)
        self._Session = sessionmaker(self._engine)
        logger.info("Database initialized: %s", db_url.split("@")[-1])

    def save_analysis(
        self,
        repo_url: str,
        analysis: RepositoryAnalysis,
        report: ReviewReport,
        readiness: ResumeReadiness,
        mentor_feedback: MentorFeedback,
        action_plan: ActionPlan,
        github_metadata: GitHubMetadata,
    ) -> AnalysisHistoryRecord:
        created_at = datetime.now(UTC).isoformat()
        row = AnalysisHistoryRow(
            repo_url=repo_url,
            created_at=created_at,
            total_files=analysis.total_files,
            total_directories=analysis.total_directories,
            language_count=len(analysis.languages),
            risk_count=len(analysis.risks),
            summary=report.summary,
            analysis_json=analysis.model_dump_json(),
            report_json=report.model_dump_json(),
            readiness_json=readiness.model_dump_json(),
            mentor_feedback_json=mentor_feedback.model_dump_json(),
            action_plan_json=action_plan.model_dump_json(),
            github_metadata_json=github_metadata.model_dump_json(),
        )
        with self._Session() as session:
            session.add(row)
            session.commit()
            session.refresh(row)
            if row.id is None:
                raise RuntimeError("Database failed to assign an id after commit")
            record_id = row.id

        logger.info("Analysis saved: repo=%s id=%d", repo_url, record_id)
        return AnalysisHistoryRecord(
            id=record_id,
            repo_url=repo_url,
            created_at=created_at,
            total_files=analysis.total_files,
            total_directories=analysis.total_directories,
            language_count=len(analysis.languages),
            risk_count=len(analysis.risks),
            summary=report.summary,
        )

    def list_recent(self, limit: int = 10) -> list[AnalysisHistoryRecord]:
        with self._Session() as session:
            rows = (
                session.execute(
                    select(AnalysisHistoryRow)
                    .order_by(desc(AnalysisHistoryRow.id))
                    .limit(limit)
                )
                .scalars()
                .all()
            )

        return [
            AnalysisHistoryRecord(
                id=row.id,
                repo_url=row.repo_url,
                created_at=row.created_at,
                total_files=row.total_files,
                total_directories=row.total_directories,
                language_count=row.language_count,
                risk_count=row.risk_count,
                summary=row.summary,
            )
            for row in rows
        ]

    def get_analysis(self, record_id: int) -> AnalysisHistoryDetail | None:
        with self._Session() as session:
            row = session.get(AnalysisHistoryRow, record_id)

        if (
            row is None
            or row.readiness_json is None
            or row.mentor_feedback_json is None
            or row.action_plan_json is None
            or row.github_metadata_json is None
        ):
            return None

        return AnalysisHistoryDetail(
            id=row.id,
            repo_url=row.repo_url,
            created_at=row.created_at,
            analysis=RepositoryAnalysis.model_validate_json(row.analysis_json),
            github_metadata=GitHubMetadata.model_validate_json(row.github_metadata_json),
            report=ReviewReport.model_validate_json(row.report_json),
            readiness=ResumeReadiness.model_validate_json(row.readiness_json),
            mentor_feedback=MentorFeedback.model_validate_json(row.mentor_feedback_json),
            action_plan=ActionPlan.model_validate_json(row.action_plan_json),
        )
