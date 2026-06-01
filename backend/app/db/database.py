import json
import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine, desc, select, text
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL
from app.db.models import (
    AnalysisHistoryRow,
    AnalysisJobRow,
    AuditEventRow,
    Base,
    SessionRow,
    UserRow,
)
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


@dataclass(frozen=True)
class AnalysisJobRecord:
    job_id: str
    user_id: int | None
    repo_url: str
    status: str
    progress: str
    result_history_id: int | None
    error: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class UserRecord:
    id: int
    username: str
    github_id: str | None
    avatar_url: str | None
    created_at: str


@dataclass(frozen=True)
class SessionRecord:
    session_id: str
    user_id: int
    created_at: str
    expires_at: str


@dataclass(frozen=True)
class AuditEventRecord:
    id: int
    event_type: str
    user_id: int | None
    actor: str
    metadata: dict[str, object]
    created_at: str


class AnalysisHistoryStore:
    def __init__(self, db_url: str = DATABASE_URL) -> None:
        connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        self._engine = create_engine(db_url, connect_args=connect_args)
        Base.metadata.create_all(self._engine)
        self._Session = sessionmaker(self._engine)
        logger.info("Database initialized: %s", db_url.split("@")[-1])

    def create_or_get_dev_user(self, username: str) -> UserRecord:
        normalized = username.strip().lower()
        if not normalized:
            raise ValueError("Username is required.")

        with self._Session() as session:
            existing = session.execute(
                select(UserRow).where(UserRow.username == normalized)
            ).scalar_one_or_none()
            if existing is not None:
                return _user_record_from_row(existing)

            row = UserRow(
                username=normalized,
                github_id=None,
                avatar_url=None,
                created_at=datetime.now(UTC).isoformat(),
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _user_record_from_row(row)

    def create_session(self, user_id: int) -> SessionRecord:
        now = datetime.now(UTC)
        row = SessionRow(
            id=str(uuid.uuid4()),
            user_id=user_id,
            created_at=now.isoformat(),
            expires_at=(now + timedelta(days=14)).isoformat(),
        )
        with self._Session() as session:
            session.add(row)
            session.commit()
            session.refresh(row)
            return _session_record_from_row(row)

    def get_user_by_session(self, session_id: str | None) -> UserRecord | None:
        if not session_id:
            return None
        now = datetime.now(UTC)
        with self._Session() as session:
            row = session.get(SessionRow, session_id)
            if row is None or datetime.fromisoformat(row.expires_at) <= now:
                return None
            user = session.get(UserRow, row.user_id)
            if user is None:
                return None
            return _user_record_from_row(user)

    def delete_session(self, session_id: str) -> None:
        with self._Session() as session:
            row = session.get(SessionRow, session_id)
            if row is not None:
                session.delete(row)
                session.commit()

    def record_audit_event(
        self,
        event_type: str,
        user_id: int | None,
        actor: str,
        metadata: dict[str, object] | None = None,
    ) -> AuditEventRecord:
        row = AuditEventRow(
            event_type=event_type,
            user_id=user_id,
            actor=actor,
            metadata_json=json.dumps(metadata or {}, sort_keys=True),
            created_at=datetime.now(UTC).isoformat(),
        )
        with self._Session() as session:
            session.add(row)
            session.commit()
            session.refresh(row)
            return _audit_event_record_from_row(row)

    def list_audit_events(self, limit: int = 20) -> list[AuditEventRecord]:
        with self._Session() as session:
            rows = (
                session.execute(
                    select(AuditEventRow).order_by(desc(AuditEventRow.id)).limit(limit)
                )
                .scalars()
                .all()
            )
        return [_audit_event_record_from_row(row) for row in rows]

    def create_job(self, repo_url: str, user_id: int | None = None) -> AnalysisJobRecord:
        now = datetime.now(UTC).isoformat()
        row = AnalysisJobRow(
            id=str(uuid.uuid4()),
            user_id=user_id,
            repo_url=repo_url,
            status="pending",
            progress="Queued...",
            result_history_id=None,
            error=None,
            created_at=now,
            updated_at=now,
        )
        with self._Session() as session:
            session.add(row)
            session.commit()
            session.refresh(row)

        logger.info("Job saved: job_id=%s repo=%s", row.id, repo_url)
        return _job_record_from_row(row)

    def check_database(self) -> bool:
        with self._Session() as session:
            session.execute(text("SELECT 1"))
        return True

    def get_job(self, job_id: str) -> AnalysisJobRecord | None:
        with self._Session() as session:
            row = session.get(AnalysisJobRow, job_id)
            if row is None:
                return None
            return _job_record_from_row(row)

    def mark_job_running(self, job_id: str, progress: str = "Running...") -> AnalysisJobRecord | None:
        return self._update_job(job_id=job_id, status="running", progress=progress, error=None)

    def update_job_progress(self, job_id: str, progress: str) -> AnalysisJobRecord | None:
        with self._Session() as session:
            row = session.get(AnalysisJobRow, job_id)
            if row is None:
                return None
            row.progress = progress
            row.updated_at = datetime.now(UTC).isoformat()
            session.commit()
            session.refresh(row)
            return _job_record_from_row(row)

    def mark_job_done(self, job_id: str, result_history_id: int) -> AnalysisJobRecord | None:
        return self._update_job(
            job_id=job_id,
            status="done",
            progress="Done",
            result_history_id=result_history_id,
            error=None,
        )

    def mark_job_failed(self, job_id: str, error: str) -> AnalysisJobRecord | None:
        return self._update_job(
            job_id=job_id,
            status="failed",
            progress="Failed",
            error=error,
        )

    def _update_job(
        self,
        job_id: str,
        status: str,
        progress: str,
        result_history_id: int | None = None,
        error: str | None = None,
    ) -> AnalysisJobRecord | None:
        with self._Session() as session:
            row = session.get(AnalysisJobRow, job_id)
            if row is None:
                return None
            row.status = status
            row.progress = progress
            row.result_history_id = result_history_id
            row.error = error
            row.updated_at = datetime.now(UTC).isoformat()
            session.commit()
            session.refresh(row)
            return _job_record_from_row(row)

    def save_analysis(
        self,
        repo_url: str,
        analysis: RepositoryAnalysis,
        report: ReviewReport,
        readiness: ResumeReadiness,
        mentor_feedback: MentorFeedback,
        action_plan: ActionPlan,
        github_metadata: GitHubMetadata,
        user_id: int | None = None,
    ) -> AnalysisHistoryRecord:
        created_at = datetime.now(UTC).isoformat()
        row = AnalysisHistoryRow(
            user_id=user_id,
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

    def list_recent(self, limit: int = 10, user_id: int | None = None) -> list[AnalysisHistoryRecord]:
        with self._Session() as session:
            statement = select(AnalysisHistoryRow)
            if user_id is not None:
                statement = statement.where(AnalysisHistoryRow.user_id == user_id)
            else:
                statement = statement.where(AnalysisHistoryRow.user_id.is_(None))
            rows = (
                session.execute(
                    statement.order_by(desc(AnalysisHistoryRow.id)).limit(limit)
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

    def get_analysis(self, record_id: int, user_id: int | None = None) -> AnalysisHistoryDetail | None:
        with self._Session() as session:
            row = session.get(AnalysisHistoryRow, record_id)

        if (
            row is None
            or row.user_id != user_id
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


def _job_record_from_row(row: AnalysisJobRow) -> AnalysisJobRecord:
    return AnalysisJobRecord(
        job_id=row.id,
        user_id=row.user_id,
        repo_url=row.repo_url,
        status=row.status,
        progress=row.progress,
        result_history_id=row.result_history_id,
        error=row.error,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _user_record_from_row(row: UserRow) -> UserRecord:
    return UserRecord(
        id=row.id,
        username=row.username,
        github_id=row.github_id,
        avatar_url=row.avatar_url,
        created_at=row.created_at,
    )


def _session_record_from_row(row: SessionRow) -> SessionRecord:
    return SessionRecord(
        session_id=row.id,
        user_id=row.user_id,
        created_at=row.created_at,
        expires_at=row.expires_at,
    )


def _audit_event_record_from_row(row: AuditEventRow) -> AuditEventRecord:
    return AuditEventRecord(
        id=row.id,
        event_type=row.event_type,
        user_id=row.user_id,
        actor=row.actor,
        metadata=dict(json.loads(row.metadata_json)),
        created_at=row.created_at,
    )
