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

export type RepositoryAnalysis = {
  total_files: number
  total_directories: number
  languages: Record<string, number>
  largest_files: FileMetric[]
  risks: RiskSignal[]
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

export type MentorFeedback = {
  mentor_summary: string
  resume_bullets: string[]
  interview_questions: string[]
  next_steps: string[]
}

export type AnalyzeResponse = {
  repo_url: string
  analysis: RepositoryAnalysis
  readiness: ResumeReadiness
  report: ReviewReport
  mentor_feedback: MentorFeedback
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
