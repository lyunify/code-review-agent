import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from app.models.schemas import AnalysisHistoryRecord, RepositoryAnalysis, ReviewReport


class AnalysisHistoryStore:
    def __init__(self, db_path: Path | str = "analysis_history.db") -> None:
        self.db_path = Path(db_path)
        self._initialize()

    def save_analysis(
        self,
        repo_url: str,
        analysis: RepositoryAnalysis,
        report: ReviewReport,
    ) -> AnalysisHistoryRecord:
        created_at = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO analysis_history (
                    repo_url,
                    created_at,
                    total_files,
                    total_directories,
                    language_count,
                    risk_count,
                    summary,
                    analysis_json,
                    report_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    repo_url,
                    created_at,
                    analysis.total_files,
                    analysis.total_directories,
                    len(analysis.languages),
                    len(analysis.risks),
                    report.summary,
                    analysis.model_dump_json(),
                    report.model_dump_json(),
                ),
            )
            connection.commit()
            record_id = int(cursor.lastrowid)

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
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    id,
                    repo_url,
                    created_at,
                    total_files,
                    total_directories,
                    language_count,
                    risk_count,
                    summary
                FROM analysis_history
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [
            AnalysisHistoryRecord(
                id=row["id"],
                repo_url=row["repo_url"],
                created_at=row["created_at"],
                total_files=row["total_files"],
                total_directories=row["total_directories"],
                language_count=row["language_count"],
                risk_count=row["risk_count"],
                summary=row["summary"],
            )
            for row in rows
        ]

    def _initialize(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS analysis_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    repo_url TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    total_files INTEGER NOT NULL,
                    total_directories INTEGER NOT NULL,
                    language_count INTEGER NOT NULL,
                    risk_count INTEGER NOT NULL,
                    summary TEXT NOT NULL,
                    analysis_json TEXT NOT NULL,
                    report_json TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection


def analysis_to_dict(analysis_json: str) -> dict:
    return json.loads(analysis_json)
