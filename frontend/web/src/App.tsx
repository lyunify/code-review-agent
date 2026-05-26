import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileQuestion,
  Gauge,
  Github,
  History,
  Layers3,
  Loader2,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import { analyzeRepository, fetchHistory } from './api'
import { generateMarkdownReport, getReportFileName } from './report'
import type { AnalyzeResponse, HistoryRecord, ReadinessChecklistItem } from './types'

type Tab = 'resume' | 'interview' | 'risks'
type View = 'dashboard' | 'rubric' | 'mentor'

function App() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/lyunify/code-review-agent')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [activeTab, setActiveTab] = useState<Tab>('resume')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [])

  async function handleAnalyze() {
    setIsLoading(true)
    setError(null)
    try {
      const payload = await analyzeRepository(repoUrl)
      setResult(payload)
      setActiveView('dashboard')
      setActiveTab('resume')
      setHistory(await fetchHistory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="workspace">
      <Sidebar history={history} activeView={activeView} onViewChange={setActiveView} />
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
            <button onClick={handleAnalyze} disabled={isLoading || repoUrl.trim().length === 0}>
              {isLoading ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
              Analyze
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {result ? (
          activeView === 'dashboard' ? (
          <Dashboard result={result} activeTab={activeTab} onTabChange={setActiveTab} />
          ) : activeView === 'rubric' ? (
            <RubricView result={result} />
          ) : (
            <MentorView result={result} />
          )
        ) : (
          <EmptyWorkbench history={history} activeView={activeView} />
        )}
      </section>
    </main>
  )
}

function Sidebar({
  history,
  activeView,
  onViewChange,
}: {
  history: HistoryRecord[]
  activeView: View
  onViewChange: (view: View) => void
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
              <div className="sidebar-history-row" key={item.id}>
                <span>{item.repo_url.replace('https://github.com/', '')}</span>
                <small>{item.risk_count} risks</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
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

function EmptyWorkbench({ history, activeView }: { history: HistoryRecord[]; activeView: View }) {
  const title =
    activeView === 'rubric'
      ? 'Run a repository review to inspect the readiness rubric.'
      : activeView === 'mentor'
        ? 'Run a repository review to generate AI mentor feedback.'
        : 'Run a repository review to generate the workspace.'

  return (
    <section className="empty-workbench">
      <div className="empty-card">
        <Sparkles size={30} />
        <h2>{title}</h2>
        <p>
          The app will create a resume readiness score, AI mentor brief, interview prep questions, project hygiene checklist, and technical scan.
        </p>
        {history.length > 0 && <span>{history.length} previous scans are available in the sidebar.</span>}
      </div>
    </section>
  )
}

export default App
