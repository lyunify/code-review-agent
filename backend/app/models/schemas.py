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
