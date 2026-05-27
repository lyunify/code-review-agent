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
    has_gitignore: bool = False
    has_env_example: bool = False
    readme_has_setup: bool = False
    readme_has_usage: bool = False
    readme_has_project_purpose: bool = False
    readme_has_tech_stack: bool = False
    readme_has_demo_assets: bool = False
    has_dependency_file: bool = False
    has_docs: bool = False
    has_frontend_backend_structure: bool = False
    has_license: bool = False
    has_ci_config: bool = False
    has_deployment_config: bool = False
    has_api_documentation: bool = False
    has_frontend_backend_integration: bool = False


class GitHubMetadata(BaseModel):
    available: bool
    full_name: str
    description: str | None = None
    topics: list[str] = Field(default_factory=list)
    license_name: str | None = None
    license_spdx_id: str | None = None
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    default_branch: str | None = None
    homepage: str | None = None
    has_homepage: bool = False
    is_archived: bool = False
    is_fork: bool = False
    created_at: str | None = None
    updated_at: str | None = None
    pushed_at: str | None = None


class ReadinessChecklistItem(BaseModel):
    name: str
    passed: bool
    points: int
    recommendation: str


class ResumeReadiness(BaseModel):
    score: int
    status: str
    checklist: list[ReadinessChecklistItem]
    priority_fixes: list[str]


class ReviewReport(BaseModel):
    summary: str
    recommendations: list[str]


class InterviewQuestion(BaseModel):
    question: str
    situation: str
    task: str
    action: str
    result: str


class MentorFeedback(BaseModel):
    mentor_summary: str
    resume_bullets: list[str]
    interview_questions: list[InterviewQuestion]
    next_steps: list[str]


class ActionPlanItem(BaseModel):
    title: str
    category: str
    why_it_matters: str
    how_to_improve: str
    resume_impact: str


class ActionPlan(BaseModel):
    items: list[ActionPlanItem]


class AnalyzeResponse(BaseModel):
    repo_url: str
    analysis: RepositoryAnalysis
    github_metadata: GitHubMetadata
    report: ReviewReport
    readiness: ResumeReadiness
    mentor_feedback: MentorFeedback
    action_plan: ActionPlan


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


class AnalysisHistoryDetail(BaseModel):
    id: int
    repo_url: str
    created_at: str
    analysis: RepositoryAnalysis
    github_metadata: GitHubMetadata
    report: ReviewReport
    readiness: ResumeReadiness
    mentor_feedback: MentorFeedback
    action_plan: ActionPlan


class JobCreatedResponse(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "pending" | "running" | "done" | "failed"
    progress: str
    result: AnalyzeResponse | None = None
    error: str | None = None
