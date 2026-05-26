import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, Code2, FileQuestion, Gauge, Layers3, MessageSquareText } from 'lucide-react'
import { generateMarkdownReport, getReportFileName } from '../report'
import type { AnalyzeResponse } from '../types'
import type { Tab } from '../uiTypes'
import { ChecklistRow, Metric } from './Shared'

export function Dashboard({
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
            <p className="repo-subtitle">Static scan, resume rubric, saved report, and AI mentor output.</p>
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
            <MetadataItem label="Default branch" value={result.github_metadata.default_branch ?? 'Unknown'} />
          </div>
          {result.github_metadata.topics.length > 0 && (
            <div className="topic-list">
              {result.github_metadata.topics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          )}
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
