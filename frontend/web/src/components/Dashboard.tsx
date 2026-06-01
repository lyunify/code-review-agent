import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Download, Github, Layers3, Network, PackageCheck, ShieldCheck } from 'lucide-react'
import { generateMarkdownReport, getReportFileName } from '../report'
import type { AnalyzeResponse, ArchitectureEdge, ArchitectureNode, ProjectIntelligence, StackEvidence, StackItem } from '../types'
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

const STACK_LAYERS: Array<{ category: string; label: string; note: string }> = [
  { category: 'Frontend', label: 'Client Layer', note: 'User-facing interface and browser runtime.' },
  { category: 'Backend', label: 'API Layer', note: 'Request handling, validation, and business logic.' },
  { category: 'Database', label: 'Data Layer', note: 'Persistence, schema, and stored state.' },
  { category: 'Data/Queue', label: 'Async Layer', note: 'Queues, cache, and background processing.' },
  { category: 'Infrastructure', label: 'Runtime Layer', note: 'Local orchestration and deployment shape.' },
  { category: 'Quality/CI', label: 'Quality Layer', note: 'Test, lint, type, and CI signals.' },
  { category: 'AI/External API', label: 'Integration Layer', note: 'External services used by the workflow.' },
]

const FLOW_LABELS: Record<string, string> = {
  user: 'User',
  frontend: 'Frontend',
  api: 'API',
  database: 'Database',
  queue: 'Queue',
  worker: 'Worker',
  external: 'External API',
}

const FLOW_SEQUENCE = ['user', 'frontend', 'api', 'database']
const ASYNC_SEQUENCE = ['api', 'queue', 'worker', 'external']

function StackMap({ intelligence }: { intelligence: ProjectIntelligence }) {
  const groups = STACK_LAYERS.map((layer) => ({
    ...layer,
    items: intelligence.stack.filter((item) => item.category === layer.category),
  })).filter((group) => group.items.length > 0)
  const totalEvidence = intelligence.stack.reduce((sum, item) => sum + item.evidence.length, 0)

  return (
    <div className="card b-tile b-stack">
      <div className="intelligence-head">
        <div className="panel-heading">
          <PackageCheck size={18} />
          <h3>System Stack</h3>
        </div>
        <span className="evidence-pill">
          <ShieldCheck size={13} />
          {totalEvidence} evidence points
        </span>
      </div>
      {groups.length === 0 ? (
        <p className="intelligence-empty">No stack evidence found yet.</p>
      ) : (
        <div className="stack-layers">
          {groups.map((group) => (
            <section className="stack-layer" key={group.category}>
              <div className="stack-layer-label">
                <span>{group.label}</span>
                <small>{group.note}</small>
              </div>
              <div className="stack-layer-body">
                <div className="tech-chip-row">
                  {group.items.slice(0, 7).map((item) => (
                    <TechChip item={item} key={`${item.category}-${item.name}`} />
                  ))}
                </div>
                <EvidenceLine items={group.items} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function TechChip({ item }: { item: StackItem }) {
  const primaryEvidence = item.evidence[0]
  return (
    <span className={`tech-chip confidence-${item.confidence}`} title={`${item.description}${primaryEvidence ? ` Evidence: ${primaryEvidence.path}` : ''}`}>
      {item.name}
    </span>
  )
}

function EvidenceLine({ items }: { items: StackItem[] }) {
  const evidence = items.flatMap((item) => item.evidence.map((entry) => ({ ...entry, name: item.name }))).slice(0, 3)
  if (evidence.length === 0) return <small className="stack-evidence">Evidence: static scan</small>

  return (
    <small className="stack-evidence">
      Evidence:{' '}
      {evidence.map((entry, index) => (
        <span key={`${entry.name}-${entry.path}-${entry.reason}`} title={`${entry.name}: ${entry.reason}`}>
          {index > 0 ? ', ' : ''}
          {entry.path}
        </span>
      ))}
    </small>
  )
}

function ArchitectureMap({ intelligence }: { intelligence: ProjectIntelligence }) {
  const architecture = intelligence.architecture
  const mainNodes = orderedNodes(architecture.nodes, FLOW_SEQUENCE)
  const asyncNodes = orderedNodes(architecture.nodes, ASYNC_SEQUENCE)

  return (
    <div className="card b-tile b-flow">
      <div className="intelligence-head">
        <div className="panel-heading">
          <Network size={18} />
          <h3>Architecture Flow</h3>
        </div>
        <span className="evidence-pill">{architecture.edges.length} inferred links</span>
      </div>
      <p className="flow-summary">{architecture.summary}</p>
      {architecture.edges.length === 0 ? (
        <p className="intelligence-empty">No flow edges inferred yet.</p>
      ) : (
        <div className="architecture-board">
          <div className="flow-track">
            {mainNodes.map((node, index) => (
              <FlowNode
                key={node.id}
                node={node}
                nextEdge={findEdge(architecture.edges, node.id, mainNodes[index + 1]?.id)}
              />
            ))}
          </div>
          {asyncNodes.length > 2 ? (
            <div className="async-track">
              <span className="branch-label">Async processing branch</span>
              <div className="flow-track compact">
                {asyncNodes.map((node, index) => (
                  <FlowNode
                    key={`async-${node.id}`}
                    node={node}
                    nextEdge={findEdge(architecture.edges, node.id, asyncNodes[index + 1]?.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="flow-evidence">
            {architecture.edges.slice(0, 4).map((edge) => (
              <FlowEvidence edge={edge} key={`${edge.source}-${edge.target}-${edge.label}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function orderedNodes(nodes: ArchitectureNode[], order: string[]) {
  return order.map((id) => nodes.find((node) => node.id === id)).filter((node): node is ArchitectureNode => Boolean(node))
}

function findEdge(edges: ArchitectureEdge[], source: string, target?: string) {
  if (!target) return undefined
  return edges.find((edge) => edge.source === source && edge.target === target)
}

function FlowNode({ node, nextEdge }: { node: ArchitectureNode; nextEdge?: ArchitectureEdge }) {
  return (
    <div className="flow-unit">
      <div className={`flow-card kind-${node.kind}`}>
        <span>{FLOW_LABELS[node.id] ?? node.label}</span>
        <small>{node.confidence} confidence</small>
      </div>
      {nextEdge ? <span className="flow-connector">{nextEdge.label}</span> : null}
    </div>
  )
}

function FlowEvidence({ edge }: { edge: ArchitectureEdge }) {
  const evidence = edge.evidence[0]
  return (
    <span title={evidence ? evidence.reason : undefined}>
      {edge.source} {'->'} {edge.target}: {evidencePath(evidence)}
    </span>
  )
}

function evidencePath(evidence?: StackEvidence) {
  if (!evidence) return 'static scan'
  return evidence.path.length > 32 ? `${evidence.path.slice(0, 29)}...` : evidence.path
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
