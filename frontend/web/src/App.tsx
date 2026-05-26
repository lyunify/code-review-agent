import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  FileQuestion,
  Gauge,
  Github,
  History,
  Layers3,
  ListChecks,
  Loader2,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import { analyzeRepository, fetchHistory, fetchHistoryRecord, getFriendlyErrorMessage } from './api'
import { generateMarkdownReport, getReportFileName } from './report'
import type { AnalyzeResponse, HistoryRecord, ReadinessChecklistItem } from './types'

type Tab = 'resume' | 'interview' | 'risks'
type View = 'dashboard' | 'action' | 'rubric' | 'mentor'
const SAMPLE_REPO_URL = 'https://github.com/lyunify/code-review-agent'

function App() {
  const [repoUrl, setRepoUrl] = useState(SAMPLE_REPO_URL)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [activeTab, setActiveTab] = useState<Tab>('resume')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null)

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [])

  async function handleAnalyze(nextRepoUrl = repoUrl) {
    const targetRepoUrl = nextRepoUrl.trim()
    setRepoUrl(targetRepoUrl)
    setIsLoading(true)
    setError(null)
    try {
      const payload = await analyzeRepository(targetRepoUrl)
      setResult(payload)
      setActiveView('dashboard')
      setActiveTab('resume')
      setHistory(await fetchHistory())
    } catch (err) {
      setError(getFriendlyErrorMessage(err instanceof Error ? err.message : 'Analysis failed'))
    } finally {
      setIsLoading(false)
    }
  }

  function handleTrySampleRepo() {
    void handleAnalyze(SAMPLE_REPO_URL)
  }

  async function handleSelectHistory(record: HistoryRecord) {
    setLoadingHistoryId(record.id)
    setError(null)
    try {
      const payload = await fetchHistoryRecord(record.id)
      setResult(payload)
      setRepoUrl(payload.repo_url)
      setActiveView('dashboard')
      setActiveTab('resume')
    } catch (err) {
      setError(getFriendlyErrorMessage(err instanceof Error ? err.message : 'Could not load saved scan'))
    } finally {
      setLoadingHistoryId(null)
    }
  }

  return (
    <main className="workspace">
      <Sidebar
        history={history}
        activeView={activeView}
        loadingHistoryId={loadingHistoryId}
        onViewChange={setActiveView}
        onSelectHistory={handleSelectHistory}
      />
      <section className="workbench">
        <header className="command-bar">
          <div>
            <p className="eyebrow">Resume readiness workspace</p>
            <h1>Repository Review</h1>
          </div>
          <div className="repo-command">
            <Github size={18} />
            <input
              aria-label="GitHub repository URL"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="github.com/username/project"
            />
            <button onClick={() => void handleAnalyze()} disabled={isLoading || repoUrl.trim().length === 0}>
              {isLoading ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
              Analyze
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <div>
              <strong>Analysis could not start</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <LoadingWorkbench repoUrl={repoUrl} />
        ) : result ? (
          activeView === 'dashboard' ? (
          <Dashboard result={result} activeTab={activeTab} onTabChange={setActiveTab} />
          ) : activeView === 'action' ? (
            <ActionPlanView result={result} />
          ) : activeView === 'rubric' ? (
            <RubricView result={result} />
          ) : (
            <MentorView result={result} />
          )
        ) : (
          <EmptyWorkbench history={history} activeView={activeView} onTrySampleRepo={handleTrySampleRepo} />
        )}
      </section>
    </main>
  )
}

function Sidebar({
  history,
  activeView,
  loadingHistoryId,
  onViewChange,
  onSelectHistory,
}: {
  history: HistoryRecord[]
  activeView: View
  loadingHistoryId: number | null
  onViewChange: (view: View) => void
  onSelectHistory: (record: HistoryRecord) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">CRA</div>
        <div>
          <strong>Code Review Agent</strong>
          <span>SDE intern project reviewer</span>
        </div>
      </div>

      <nav className="side-nav">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => onViewChange('dashboard')}>
          <Gauge size={18} />
          Review dashboard
        </button>
        <button className={activeView === 'rubric' ? 'active' : ''} onClick={() => onViewChange('rubric')}>
          <ClipboardList size={18} />
          Readiness rubric
        </button>
        <button className={activeView === 'action' ? 'active' : ''} onClick={() => onViewChange('action')}>
          <ListChecks size={18} />
          Action plan
        </button>
        <button className={activeView === 'mentor' ? 'active' : ''} onClick={() => onViewChange('mentor')}>
          <Sparkles size={18} />
          AI mentor
        </button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-title">
          <History size={16} />
          Recent scans
        </div>
        {history.length === 0 ? (
          <p className="sidebar-empty">No saved scans yet.</p>
        ) : (
          <div className="sidebar-history">
            {history.slice(0, 4).map((item) => (
              <button
                className="sidebar-history-row"
                key={item.id}
                onClick={() => onSelectHistory(item)}
                disabled={loadingHistoryId !== null}
              >
                <span>{item.repo_url.replace('https://github.com/', '')}</span>
                <small>{loadingHistoryId === item.id ? 'Loading saved report...' : `${item.risk_count} risks`}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function ActionPlanView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="repo-header panel">
        <div>
          <p className="eyebrow">Action plan</p>
          <h2>What should this student fix next?</h2>
        </div>
        <span className="status-pill ready">{result.action_plan.items.length} priority steps</span>
      </div>

      <div className="action-plan-grid">
        {result.action_plan.items.map((item, index) => (
          <article className="panel action-step" key={`${item.title}-${index}`}>
            <div className="action-step-index">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <div className="action-step-header">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
              </div>
              <dl>
                <div>
                  <dt>Why it matters</dt>
                  <dd>{item.why_it_matters}</dd>
                </div>
                <div>
                  <dt>How to improve</dt>
                  <dd>{item.how_to_improve}</dd>
                </div>
                <div>
                  <dt>Resume impact</dt>
                  <dd>{item.resume_impact}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function RubricView({ result }: { result: AnalyzeResponse }) {
  const passedCount = result.readiness.checklist.filter((item) => item.passed).length
  const totalPoints = result.readiness.checklist.reduce((sum, item) => sum + item.points, 0)

  return (
    <section className="single-view">
      <div className="repo-header panel">
        <div>
          <p className="eyebrow">Readiness rubric</p>
          <h2>What makes this project resume-ready?</h2>
        </div>
        <span className="status-pill ready">
          {passedCount}/{result.readiness.checklist.length} passed
        </span>
      </div>

      <div className="rubric-grid">
        <article className="panel rubric-summary">
          <h3>Rubric overview</h3>
          <p>
            The score combines documentation quality, testing, dependency setup, architecture signals, file health, and project structure.
            This keeps the AI mentor grounded in measurable engineering signals instead of guessing from a repo name.
          </p>
          <div className="rubric-stat-row">
            <Metric label="Score" value={`${result.readiness.score}/100`} icon={<Gauge size={18} />} />
            <Metric label="Rubric points" value={totalPoints.toString()} icon={<ClipboardList size={18} />} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <ClipboardList size={19} />
            <h3>Current project checklist</h3>
          </div>
          <div className="rubric-list">
            {result.readiness.checklist.map((item) => (
              <ChecklistRow item={item} key={item.name} />
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function MentorView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="repo-header panel">
        <div>
          <p className="eyebrow">AI mentor</p>
          <h2>Turn this repo into an interview story.</h2>
        </div>
        <span className="status-pill ready">OpenAI-backed</span>
      </div>

      <section className="panel mentor-panel mentor-page">
        <div className="panel-heading">
          <MessageSquareText size={19} />
          <h3>Mentor summary</h3>
        </div>
        <p>{result.mentor_feedback.mentor_summary}</p>
      </section>

      <div className="mentor-page-grid">
        <article className="panel">
          <div className="panel-heading">
            <Sparkles size={19} />
            <h3>Resume bullets</h3>
          </div>
          <div className="card-list">
            {result.mentor_feedback.resume_bullets.map((bullet, index) => (
              <div className="content-card" key={bullet}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{bullet}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <FileQuestion size={19} />
            <h3>Interview questions</h3>
          </div>
          <div className="card-list">
            {result.mentor_feedback.interview_questions.map((question, index) => (
              <div className="content-card" key={question}>
                <FileQuestion size={18} />
                <p>
                  <strong>Q{index + 1}.</strong> {question}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function Dashboard({
  result,
  activeTab,
  onTabChange,
}: {
  result: AnalyzeResponse
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const statusClass = result.readiness.score >= 85 ? 'ready' : result.readiness.score >= 65 ? 'mid' : 'low'
  const languageRows = useMemo(
    () => Object.entries(result.analysis.languages).sort((a, b) => b[1] - a[1]),
    [result.analysis.languages],
  )

  function handleDownloadReport() {
    const report = generateMarkdownReport(result)
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getReportFileName(result)
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dashboard-grid">
      <section className="primary-column">
        <div className="repo-header panel">
          <div>
            <p className="eyebrow">Generated report</p>
            <h2>{result.repo_url.replace('https://github.com/', '')}</h2>
          </div>
          <div className="report-actions">
            <button className="download-button" onClick={handleDownloadReport}>
              Download report
            </button>
            <span className={`status-pill ${statusClass}`}>{result.readiness.status}</span>
          </div>
        </div>

        <section className="metric-grid">
          <Metric label="Readiness" value={`${result.readiness.score}/100`} icon={<Gauge size={18} />} />
          <Metric label="Files" value={result.analysis.total_files.toLocaleString()} icon={<Code2 size={18} />} />
          <Metric label="Languages" value={Object.keys(result.analysis.languages).length.toString()} icon={<Layers3 size={18} />} />
          <Metric label="Risks" value={result.analysis.risks.length.toString()} icon={<AlertTriangle size={18} />} />
        </section>

        <section className="panel mentor-panel">
          <div className="panel-heading">
            <MessageSquareText size={19} />
            <h3>AI Mentor Brief</h3>
          </div>
          <p>{result.mentor_feedback.mentor_summary}</p>
        </section>

        <section className="panel tab-panel">
          <div className="tabs">
            <button className={activeTab === 'resume' ? 'active' : ''} onClick={() => onTabChange('resume')}>
              Resume bullets
            </button>
            <button className={activeTab === 'interview' ? 'active' : ''} onClick={() => onTabChange('interview')}>
              Interview prep
            </button>
            <button className={activeTab === 'risks' ? 'active' : ''} onClick={() => onTabChange('risks')}>
              Risk signals
            </button>
          </div>
          <TabContent result={result} activeTab={activeTab} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <Code2 size={19} />
            <h3>Technical Scan</h3>
          </div>
          <p className="summary">{result.report.summary}</p>
          <div className="language-grid">
            {languageRows.map(([language, count]) => (
              <div className="language-card" key={language}>
                <span>{language}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="inspector-column">
        <section className="panel inspector-panel">
          <div className="panel-heading">
            <CheckCircle2 size={19} />
            <h3>Readiness Inspector</h3>
          </div>
          <div className="score-ring">
            <strong>{result.readiness.score}</strong>
            <span>/100</span>
          </div>
          <div className="fix-list">
            <h4>Next best fixes</h4>
            {result.readiness.priority_fixes.slice(0, 4).map((fix, index) => (
              <div className="fix-row" key={fix}>
                <span>{index + 1}</span>
                <p>{fix}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel checklist-panel">
          <div className="panel-heading">
            <ClipboardList size={19} />
            <h3>Checklist</h3>
          </div>
          {result.readiness.checklist.map((item) => (
            <ChecklistRow item={item} key={item.name} />
          ))}
        </section>
      </aside>
    </div>
  )
}

function TabContent({ result, activeTab }: { result: AnalyzeResponse; activeTab: Tab }) {
  if (activeTab === 'resume') {
    return (
      <div className="card-list">
        {result.mentor_feedback.resume_bullets.map((bullet, index) => (
          <div className="content-card" key={bullet}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{bullet}</p>
          </div>
        ))}
      </div>
    )
  }

  if (activeTab === 'interview') {
    return (
      <div className="card-list">
        {result.mentor_feedback.interview_questions.map((question, index) => (
          <div className="content-card" key={question}>
            <FileQuestion size={18} />
            <p>
              <strong>Q{index + 1}.</strong> {question}
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card-list">
      {result.analysis.risks.length === 0 ? (
        <div className="content-card success-card">
          <CheckCircle2 size={18} />
          <p>No risk signals found in the first-pass scan.</p>
        </div>
      ) : (
        result.analysis.risks.slice(0, 8).map((risk) => (
          <div className="content-card" key={`${risk.message}-${risk.path ?? 'repo'}`}>
            <AlertTriangle size={18} />
            <p>
              <strong>{risk.severity}</strong> {risk.message}
              {risk.path ? <em>{risk.path}</em> : null}
            </p>
          </div>
        ))
      )}
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ChecklistRow({ item }: { item: ReadinessChecklistItem }) {
  return (
    <div className="check-row">
      <span className={item.passed ? 'dot pass' : 'dot fail'} />
      <div>
        <strong>{item.name}</strong>
        <p>{item.recommendation}</p>
      </div>
      <span className="points">{item.points}</span>
    </div>
  )
}

function LoadingWorkbench({ repoUrl }: { repoUrl: string }) {
  const steps = [
    { label: 'Clone repository', detail: 'Fetch public GitHub files for analysis.' },
    { label: 'Scan project structure', detail: 'Inspect README, tests, docs, dependencies, and file health.' },
    { label: 'Calculate readiness', detail: 'Score the repo against the SDE intern resume rubric.' },
    { label: 'Generate mentor output', detail: 'Create action plan, resume bullets, and interview prep.' },
  ]

  return (
    <section className="loading-workbench panel">
      <div>
        <p className="eyebrow">Analysis pipeline</p>
        <h2>Reviewing {repoUrl.replace('https://github.com/', '')}</h2>
      </div>
      <div className="loading-steps">
        {steps.map((step, index) => (
          <div className="loading-step" key={step.label}>
            <span>{index === 0 ? <Loader2 className="spin" size={17} /> : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function EmptyWorkbench({
  history,
  activeView,
  onTrySampleRepo,
}: {
  history: HistoryRecord[]
  activeView: View
  onTrySampleRepo: () => void
}) {
  const title =
    activeView === 'rubric'
      ? 'Run a repository review to inspect the readiness rubric.'
      : activeView === 'action'
        ? 'Run a repository review to generate a prioritized action plan.'
      : activeView === 'mentor'
        ? 'Run a repository review to generate AI mentor feedback.'
        : 'Run a repository review to generate the workspace.'

  return (
    <section className="empty-workbench">
      <div className="empty-card">
        <Sparkles size={30} />
        <h2>{title}</h2>
        <p>
          Start with a public GitHub repository to generate a readiness score, prioritized action plan, resume bullets,
          interview prep, and a saved report you can revisit later.
        </p>
        <div className="empty-actions">
          <button onClick={onTrySampleRepo}>
            <Github size={17} />
            Try sample repo
          </button>
        </div>
        <div className="empty-feature-grid">
          <div>
            <Gauge size={19} />
            <strong>Score</strong>
            <span>Resume-readiness rubric</span>
          </div>
          <div>
            <ListChecks size={19} />
            <strong>Action plan</strong>
            <span>Prioritized next fixes</span>
          </div>
          <div>
            <FileText size={19} />
            <strong>Report</strong>
            <span>Markdown export</span>
          </div>
        </div>
        {history.length > 0 && <span>{history.length} previous scans are available in the sidebar.</span>}
      </div>
    </section>
  )
}

export default App
