import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  FileText,
  Github,
  History,
  Loader2,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import { analyzeRepository, fetchHistory } from './api'
import type { AnalyzeResponse, HistoryRecord, ReadinessChecklistItem } from './types'

function App() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/lyunify/code-review-agent')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
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
      setHistory(await fetchHistory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <nav className="top-nav">
        <div className="brand">
          <span className="brand-mark">CRA</span>
          <span>Code Review Agent</span>
        </div>
        <div className="nav-links">
          <span>Resume score</span>
          <span>AI mentor</span>
          <span>Repo hygiene</span>
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">Issue No. 01 · For SDE internship candidates</p>
          <h1>Know if your GitHub project is ready for the resume.</h1>
          <p className="hero-copy">
            Analyze documentation, tests, structure, risk signals, and AI mentor feedback before a project goes on your SDE intern resume.
          </p>
        </div>
        <HeroPreview />
      </section>

      <section className="analyze-bar">
        <Github size={20} />
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
      </section>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {result ? <Dashboard result={result} /> : <EmptyState history={history} />}

      <HistoryPanel history={history} />
    </main>
  )
}

function HeroPreview() {
  return (
    <aside className="hero-preview" aria-label="Product preview">
      <div className="preview-toolbar">
        <span>repo_ready.review</span>
        <strong>Live report</strong>
      </div>
      <div className="preview-score">
        <div>
          <p>Readiness</p>
          <strong>86</strong>
        </div>
        <span>Resume-ready</span>
      </div>
      <div className="preview-thread">
        <div className="preview-line">
          <Cpu size={16} />
          <span>README has setup, stack, and demo signals.</span>
        </div>
        <div className="preview-line muted-line">
          <Sparkles size={16} />
          <span>Prepare answers for scaling, tests, and tradeoffs.</span>
        </div>
      </div>
      <div className="preview-checks">
        <span>Tests</span>
        <span>Docs</span>
        <span>AI mentor</span>
      </div>
    </aside>
  )
}

function Dashboard({ result }: { result: AnalyzeResponse }) {
  const statusClass = result.readiness.score >= 85 ? 'ready' : result.readiness.score >= 65 ? 'mid' : 'low'
  const languageRows = useMemo(
    () => Object.entries(result.analysis.languages).sort((a, b) => b[1] - a[1]),
    [result.analysis.languages],
  )

  return (
    <>
      <section className="report-header">
        <p className="eyebrow">Generated project review</p>
        <h2>{result.repo_url.replace('https://github.com/', '')}</h2>
      </section>

      <section className="score-grid">
        <Metric label="Readiness score" value={`${result.readiness.score}/100`} />
        <Metric label="Status" value={result.readiness.status} accent={statusClass} />
        <Metric label="Files scanned" value={result.analysis.total_files.toLocaleString()} />
        <Metric label="Risk signals" value={result.analysis.risks.length.toString()} />
      </section>

      <section className="main-grid">
        <article className="panel panel-large">
          <div className="panel-heading">
            <MessageSquareText size={20} />
            <h2>Mentor Feedback</h2>
          </div>
          <p className="mentor-summary">{result.mentor_feedback.mentor_summary}</p>
          <div className="three-column">
            <ListBlock title="Resume bullets" items={result.mentor_feedback.resume_bullets} />
            <ListBlock title="Interview prep" items={result.mentor_feedback.interview_questions} />
            <ListBlock title="Next steps" items={result.mentor_feedback.next_steps} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <CheckCircle2 size={20} />
            <h2>Before Resume</h2>
          </div>
          <ul className="clean-list">
            {result.readiness.priority_fixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-heading">
            <FileText size={20} />
            <h2>Readiness Checklist</h2>
          </div>
          <div className="checklist">
            {result.readiness.checklist.map((item) => (
              <ChecklistRow item={item} key={item.name} />
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <Code2 size={20} />
            <h2>Technical Scan</h2>
          </div>
          <p className="summary">{result.report.summary}</p>
          <div className="scan-stats">
            <span>{result.analysis.total_directories} directories</span>
            <span>{result.analysis.largest_files.length} largest files tracked</span>
          </div>
          <div className="language-list">
            {languageRows.map(([language, count]) => (
              <div className="language-row" key={language}>
                <span>{language}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <article className={`metric ${accent ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul className="clean-list compact">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
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
      <span className="points">{item.points} pts</span>
    </div>
  )
}

function EmptyState({ history }: { history: HistoryRecord[] }) {
  return (
    <section className="empty-state">
      <Sparkles size={28} />
      <h2>Start with a GitHub repository URL.</h2>
      <p>
        The report will combine deterministic project hygiene checks with mentor-style feedback for resume and interview preparation.
      </p>
      {history.length > 0 && <span>{history.length} previous analyses are available below.</span>}
    </section>
  )
}

function HistoryPanel({ history }: { history: HistoryRecord[] }) {
  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <History size={20} />
        <h2>Recent Analyses</h2>
      </div>
      {history.length === 0 ? (
        <p className="summary">No saved analyses yet.</p>
      ) : (
        <div className="history-list">
          {history.slice(0, 5).map((item) => (
            <div className="history-row" key={item.id}>
              <span>{item.repo_url}</span>
              <strong>{item.total_files} files</strong>
              <em>{item.risk_count} risks</em>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default App
