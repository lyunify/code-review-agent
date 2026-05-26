from pydantic import BaseModel, Field, HttpUrl


class AnalyzeRequest(BaseModel):
    repo_url: HttpUrl = Field(..., description="Public GitHub repository URL to analyze.")


class FileMetric(BaseModel):
    path: str
    size_bytes: int
    lines: int
    language: str


class RiskSignal(BaseModel):
    severity: str
    message: str
    path: str | None = None


class RepositoryAnalysis(BaseModel):
    total_files: int
    total_directories: int
    languages: dict[str, int]
    largest_files: list[FileMetric]
    risks: list[RiskSignal]
    has_readme: bool
    has_tests: bool


class ReviewReport(BaseModel):
    summary: str
    recommendations: list[str]


class AnalyzeResponse(BaseModel):
    repo_url: str
    analysis: RepositoryAnalysis
    report: ReviewReport


class AnalysisHistoryRecord(BaseModel):
    id: int
    repo_url: str
    created_at: str
    total_files: int
    total_directories: int
    language_count: int
    risk_count: int
    summary: str


class AnalysisHistoryResponse(BaseModel):
    records: list[AnalysisHistoryRecord]
