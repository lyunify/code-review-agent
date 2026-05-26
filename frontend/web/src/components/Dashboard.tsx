import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Layers3,
} from 'lucide-react'
import { generateMarkdownReport, getReportFileName } from '../report'
import type { AnalyzeResponse } from '../types'
import type { Tab } from '../uiTypes'

export function Dashboard({
  result,
  activeTab,
  onTabChange,
}: {
  result: AnalyzeResponse
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const scoreClass =
    result.readiness.score >= 85 ? '' : result.readiness.score >= 65 ? 'mid' : 'low'
  const statusClass = result.readiness.score >= 85 ? 'ready' : result.readiness.score >= 65 ? 'mid' : 'low'

  const languageKeys = useMemo(() => Object.keys(result.analysis.languages), [result.analysis.languages])

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

  const mentorSnippet = result.mentor_feedback.mentor_summary.split(/\.\s/)[0] + '.'

  return (
    <div>
      {/* Split hero */}
      <div className="split-hero">
        <div className="split-hero-score">
          <div className={`split-hero-num${scoreClass ? ` ${scoreClass}` : ''}`}>
            {result.readiness.score}
          </div>
          <span className={`status-pill ${statusClass}`}>{result.readiness.status}</span>
        </div>
        <div className="split-hero-right">
          <p className="split-hero-name">{result.repo_url.replace('https://github.com/', '')}</p>
          <p className="split-hero-sub">
            {result.readiness.score}/100 · {result.analysis.total_files.toLocaleString()} files · {languageKeys.length} languages · {result.analysis.risks.length} risks
          </p>
          <p className="split-hero-quote">{mentorSnippet}</p>
          <div className="split-hero-fixes">
            {result.readiness.priority_fixes.slice(0, 3).map((fix) => (
              <span key={fix} className="split-hero-fix">+ {fix}</span>
            ))}
          </div>
        </div>
        <button className="score-download" onClick={handleDownloadReport} style={{ margin: '20px 20px 20px 0', alignSelf: 'flex-start' }}>
          <Download size={14} />
          Report
        </button>
      </div>

      {/* Resume / Interview / Risks tabs */}
      <section className="panel">
        <nav className="content-tabs">
          <button
            className={`content-tab${activeTab === 'resume' ? ' active' : ''}`}
            onClick={() => onTabChange('resume')}
          >
            Resume bullets
          </button>
          <button
            className={`content-tab${activeTab === 'interview' ? ' active' : ''}`}
            onClick={() => onTabChange('interview')}
          >
            Interview prep
          </button>
          <button
            className={`content-tab${activeTab === 'risks' ? ' active' : ''}`}
            onClick={() => onTabChange('risks')}
          >
            Risk signals
          </button>
        </nav>
        <TabContent result={result} activeTab={activeTab} />
      </section>

      {/* GitHub Profile Signals */}
      <section className="panel">
        <div className="panel-heading">
          <Layers3 size={19} />
          <h3>GitHub Profile Signals</h3>
        </div>
        <div className="metadata-grid">
          <MetadataItem label="Description" value={result.github_metadata.description ? 'Present' : 'Missing'} />
          <MetadataItem label="License" value={result.github_metadata.license_spdx_id ?? 'Missing'} />
          <MetadataItem label="Topics" value={result.github_metadata.topics.length.toString()} />
          <MetadataItem label="Homepage" value={result.github_metadata.has_homepage ? 'Present' : 'Missing'} />
          <MetadataItem label="Fork" value={result.github_metadata.is_fork ? 'Yes' : 'No'} />
          <MetadataItem label="Branch" value={result.github_metadata.default_branch ?? 'Unknown'} />
        </div>
        {result.github_metadata.topics.length > 0 && (
          <div className="topic-list">
            {result.github_metadata.topics.map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TabContent({ result, activeTab }: { result: AnalyzeResponse; activeTab: Tab }) {
  if (activeTab === 'resume') {
    return (
      <div className="bullet-list">
        {result.mentor_feedback.resume_bullets.map((bullet, index) => (
          <div className="bullet-item" key={bullet}>
            <span className="bullet-num">{String(index + 1).padStart(2, '0')}</span>
            <p className="bullet-text">{bullet}</p>
          </div>
        ))}
      </div>
    )
  }

  if (activeTab === 'interview') {
    return (
      <div className="bullet-list">
        {result.mentor_feedback.interview_questions.map((question, index) => (
          <div className="bullet-item" key={question}>
            <span className="bullet-num">Q{index + 1}</span>
            <p className="bullet-text">{question}</p>
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

