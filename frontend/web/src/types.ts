export type FileMetric = {
  path: string
  size_bytes: number
  lines: number
  language: string
}

export type RiskSignal = {
  severity: string
  message: string
  path: string | null
}

export type StackEvidence = {
  path: string
  reason: string
}

export type StackItem = {
  name: string
  category: string
  description: string
  confidence: string
  evidence: StackEvidence[]
}

export type ArchitectureNode = {
  id: string
  label: string
  kind: string
  confidence: string
  evidence: StackEvidence[]
}

export type ArchitectureEdge = {
  source: string
  target: string
  label: string
  confidence: string
  evidence: StackEvidence[]
}

export type ArchitectureFlow = {
  summary: string
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  mermaid: string
}

export type ToyRiskReason = {
  title: string
  evidence: string
  sentiment: 'positive' | 'negative' | string
}

export type ToyProjectRisk = {
  level: 'low' | 'medium' | 'high' | 'unknown' | string
  label: string
  summary: string
  confidence: string
  score: number
  reasons: ToyRiskReason[]
}

export type ProjectIntelligence = {
  stack: StackItem[]
  architecture: ArchitectureFlow
  toy_project_risk?: ToyProjectRisk
}

export type RepositoryAnalysis = {
  total_files: number
  total_directories: number
  languages: Record<string, number>
  largest_files: FileMetric[]
  risks: RiskSignal[]
  project_intelligence?: ProjectIntelligence
}

export type GitHubMetadata = {
  available: boolean
  full_name: string
  description: string | null
  topics: string[]
  license_name: string | null
  license_spdx_id: string | null
  stars: number
  forks: number
  open_issues: number
  default_branch: string | null
  homepage: string | null
  has_homepage: boolean
  is_archived: boolean
  is_fork: boolean
  created_at: string | null
  updated_at: string | null
  pushed_at: string | null
}

export type ReadinessChecklistItem = {
  name: string
  passed: boolean
  points: number
  recommendation: string
}

export type ResumeReadiness = {
  score: number
  status: string
  checklist: ReadinessChecklistItem[]
  priority_fixes: string[]
}

export type ReviewReport = {
  summary: string
  recommendations: string[]
}

export type InterviewQuestion = {
  question: string
  situation: string
  task: string
  action: string
  result: string
}

export type MentorFeedback = {
  mentor_summary: string
  resume_bullets: string[]
  interview_questions: InterviewQuestion[]
  next_steps: string[]
}

export type ActionPlanItem = {
  title: string
  category: string
  why_it_matters: string
  how_to_improve: string
  resume_impact: string
}

export type ActionPlan = {
  items: ActionPlanItem[]
}

export type AnalyzeResponse = {
  repo_url: string
  analysis: RepositoryAnalysis
  github_metadata: GitHubMetadata
  readiness: ResumeReadiness
  report: ReviewReport
  mentor_feedback: MentorFeedback
  action_plan: ActionPlan
}

export type HistoryRecord = {
  id: number
  repo_url: string
  created_at: string
  total_files: number
  total_directories: number
  language_count: number
  risk_count: number
  summary: string
}

export type HistoryDetail = AnalyzeResponse & {
  id: number
  created_at: string
}

export type CurrentUser = {
  id: number
  username: string
  avatar_url: string | null
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export type JobStatusResponse = {
  job_id: string
  status: JobStatus
  progress: string
  result: AnalyzeResponse | null
  error: string | null
}
