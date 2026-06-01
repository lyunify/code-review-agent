import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Download, Github, Layers3, Network, PackageCheck } from 'lucide-react'
import { generateMarkdownReport, getReportFileName } from '../report'
import type { AnalyzeResponse, ArchitectureEdge, ProjectIntelligence, StackItem } from '../types'
import type { Tab } from '../uiTypes'
import { Eyebrow, ScoreGauge, scoreBand, scoreGrade } from './Shared'

const LANG_COLORS: Record<string, string> = {
  Python: '#6e9cf6',
  TypeScript: '#7c6cff',
  JavaScript: '#f0c020',
  CSS: '#57e08f',
  Markdown: '#9aa0ad',
  TOML: '#f5b740',
  JSON: '#ff8b6b',
}
const langColor = (lang: string) => LANG_COLORS[lang] ?? '#9aa0ad'

export function Dashboard({
  result,
  activeTab,
  onTabChange,
}: {
  result: AnalyzeResponse
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const statusClass = scoreBand(result.readiness.score)
  const languageEntries = useMemo(
    () => Object.entries(result.analysis.languages).sort((a, b) => b[1] - a[1]),
    [result.analysis.languages],
  )
  const totalLang = languageEntries.reduce((sum, [, n]) => sum + n, 0) || 1
  const repoName = result.repo_url.replace('https://github.com/', '')
  const intelligence = result.analysis.project_intelligence ?? EMPTY_INTELLIGENCE

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

  const stats: Array<[string, number, string]> = [
    ['files', result.analysis.total_files, 'files'],
    ['langs', languageEntries.length, 'languages'],
    ['dirs', result.analysis.total_directories, 'directories'],
    ['risks', result.analysis.risks.length, 'risks'],
  ]

  return (
    <div className="single-view">
      <div className="bento">
        {/* score */}
        <div className="card b-tile b-score">
          <ScoreGauge score={result.readiness.score} size={150} stroke={10} />
          <div className="gradewrap">
            <span className={`status-pill ${statusClass}`}>
              <span className="pulse" />
              {result.readiness.status}
            </span>
            <span className="grade-letter">Grade {scoreGrade(result.readiness.score)}</span>
          </div>
        </div>

        {/* identity */}
        <div className="card b-tile b-id">
          <p className="repo-name">
            <Github size={20} />
            {repoName}
          </p>
          <p className="repo-sub">
            {result.readiness.score}/100 · {result.analysis.total_files.toLocaleString()} files ·{' '}
            {languageEntries.length} languages · {result.analysis.risks.length} risks
          </p>
          <p className="repo-quote">{result.mentor_feedback.mentor_summary}</p>
          <div className="topic-list">
            {result.github_metadata.topics.slice(0, 6).map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
        </div>

        {/* stat tiles */}
        {stats.map(([key, value, label]) => (
          <div className="card b-tile b-stat" key={key}>
            <span className="mval">{value}</span>
            <span className="mlabel">{label}</span>
          </div>
        ))}

        {/* bullets / tabs */}
        <div className="card b-tile b-bullets">
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
        </div>

        {/* language */}
        <div className="card b-tile b-lang">
          <div className="bento-tilehead">
            <Eyebrow>Languages</Eyebrow>
          </div>
          <div className="langbar">
            {languageEntries.map(([lang, count]) => (
              <i key={lang} style={{ width: `${(count / totalLang) * 100}%`, background: langColor(lang) }} title={`${lang} ${count}`} />
            ))}
          </div>
          <div className="langlegend">
            {languageEntries.map(([lang, count]) => (
              <span key={lang}>
                <span className="swatch" style={{ background: langColor(lang) }} />
                {lang} <b>{count}</b>
              </span>
            ))}
          </div>
        </div>

        <StackMap intelligence={intelligence} />
        <ArchitectureMap intelligence={intelligence} />

        {/* github signals */}
        <div className="card b-tile b-signals">
          <div className="panel-heading">
            <Layers3 size={18} />
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
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="icon-btn" style={{ width: 'auto', padding: '0 16px', gap: 8, fontSize: 13, fontWeight: 600 }} onClick={handleDownloadReport}>
              <Download size={14} />
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EMPTY_INTELLIGENCE: ProjectIntelligence = {
  stack: [],
  architecture: { summary: 'No architecture inference available for this scan.', nodes: [], edges: [], mermaid: '' },
}

const STACK_ORDER = ['Frontend', 'Backend', 'Database', 'Data/Queue', 'Infrastructure', 'Quality/CI', 'AI/External API']

function StackMap({ intelligence }: { intelligence: ProjectIntelligence }) {
  const groups = STACK_ORDER.map((category) => ({
    category,
    items: intelligence.stack.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="card b-tile b-stack">
      <div className="panel-heading">
        <PackageCheck size={18} />
        <h3>Stack Map</h3>
      </div>
      {groups.length === 0 ? (
        <p className="intelligence-empty">No stack evidence found yet.</p>
      ) : (
        <div className="stack-groups">
          {groups.map((group) => (
            <section className="stack-group" key={group.category}>
              <span className="stack-category">{group.category}</span>
              <div className="stack-list">
                {group.items.slice(0, 5).map((item) => (
                  <StackChip item={item} key={`${item.category}-${item.name}`} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function StackChip({ item }: { item: StackItem }) {
  const primaryEvidence = item.evidence[0]
  return (
    <article className="stack-chip">
      <div>
        <strong>{item.name}</strong>
        <span>{item.description}</span>
      </div>
      <small title={primaryEvidence ? `${primaryEvidence.path}: ${primaryEvidence.reason}` : undefined}>
        {item.confidence} · {primaryEvidence?.path ?? 'static scan'}
      </small>
    </article>
  )
}

function ArchitectureMap({ intelligence }: { intelligence: ProjectIntelligence }) {
  const architecture = intelligence.architecture
  const visibleEdges = architecture.edges.slice(0, 6)

  return (
    <div className="card b-tile b-flow">
      <div className="panel-heading">
        <Network size={18} />
        <h3>Architecture Flow</h3>
      </div>
      <p className="flow-summary">{architecture.summary}</p>
      {visibleEdges.length === 0 ? (
        <p className="intelligence-empty">No flow edges inferred yet.</p>
      ) : (
        <>
          <div className="flow-lane">
            {visibleEdges.map((edge) => (
              <FlowEdge edge={edge} key={`${edge.source}-${edge.target}-${edge.label}`} />
            ))}
          </div>
          <details className="mermaid-box">
            <summary>Mermaid source</summary>
            <pre>{architecture.mermaid}</pre>
          </details>
        </>
      )}
    </div>
  )
}

function FlowEdge({ edge }: { edge: ArchitectureEdge }) {
  const evidence = edge.evidence[0]
  return (
    <div className="flow-edge">
      <span className="flow-node">{edge.source}</span>
      <span className="flow-arrow">{edge.label}</span>
      <span className="flow-node">{edge.target}</span>
      <small title={evidence ? evidence.reason : undefined}>{evidence?.path ?? edge.confidence}</small>
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
        {result.mentor_feedback.interview_questions.map((q, index) => (
          <div className="bullet-item" key={q.question}>
            <span className="bullet-num">Q{index + 1}</span>
            <p className="bullet-text">{q.question}</p>
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
