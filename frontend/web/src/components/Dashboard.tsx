import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Download, Github, Layers3, Network, PackageCheck, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { generateMarkdownReport, getReportFileName } from '../report'
import type { AnalyzeResponse, ArchitectureEdge, ArchitectureNode, ProjectIntelligence, ReadinessChecklistItem, StackEvidence, StackItem, ToyProjectRisk } from '../types'
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

        <ToyRiskPanel intelligence={intelligence} readinessScore={result.readiness.score} riskCount={result.analysis.risks.length} />
        <ProductionSignals result={result} />

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

        <div className="card b-tile b-signals">
          <details className="repo-metadata">
            <summary>
              <span>
                <Layers3 size={16} />
                Repo metadata
              </span>
              <small>GitHub profile signals, kept as supporting context</small>
            </summary>
            <div className="metadata-grid compact">
              <MetadataItem label="Description" value={result.github_metadata.description ? 'Present' : 'Missing'} />
              <MetadataItem label="License" value={result.github_metadata.license_spdx_id ?? 'Missing'} />
              <MetadataItem label="Topics" value={result.github_metadata.topics.length.toString()} />
              <MetadataItem label="Homepage" value={result.github_metadata.has_homepage ? 'Present' : 'Missing'} />
              <MetadataItem label="Fork" value={result.github_metadata.is_fork ? 'Yes' : 'No'} />
              <MetadataItem label="Branch" value={result.github_metadata.default_branch ?? 'Unknown'} />
            </div>
          </details>
          <div className="report-row">
            <button className="icon-btn report-button" onClick={handleDownloadReport}>
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
  toy_project_risk: {
    level: 'unknown',
    label: 'Not enough evidence',
    summary: 'Run a scan with repository structure, dependencies, and quality signals to infer toy-project risk.',
    confidence: 'low',
    score: 0,
    reasons: [],
  },
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

const PRODUCTION_SIGNAL_GROUPS = [
  {
    label: 'Runnable',
    description: 'Can another engineer clone, configure, and run it?',
    checks: ['Dependency file exists', '.env.example exists', 'Deployment configuration exists'],
  },
  {
    label: 'Quality',
    description: 'Does it show automated engineering discipline?',
    checks: ['Automated tests exist', 'CI workflow exists', 'Risk density is low'],
  },
  {
    label: 'Full-stack',
    description: 'Are frontend and backend connected as one product?',
    checks: ['Frontend/backend boundaries are clear', 'Frontend calls backend API', 'API documentation exists'],
  },
  {
    label: 'Operability',
    description: 'Can someone understand and maintain the system shape?',
    checks: ['Architecture docs exist', 'README includes setup instructions', 'README lists tech stack'],
  },
  {
    label: 'Repo hygiene',
    description: 'Basic public repository hygiene for review.',
    checks: ['.gitignore exists', 'License file exists', 'README includes screenshots or demo assets'],
  },
]

function ToyRiskPanel({
  intelligence,
  readinessScore,
  riskCount,
}: {
  intelligence: ProjectIntelligence
  readinessScore: number
  riskCount: number
}) {
  const risk = intelligence.toy_project_risk ?? fallbackToyRisk(readinessScore, riskCount)
  const proof = risk.reasons.filter((reason) => reason.sentiment !== 'negative').slice(0, 3)
  const watch = risk.reasons.filter((reason) => reason.sentiment === 'negative').slice(0, 2)
  const levelClass = `toy-${risk.level}`

  return (
    <section className={`card b-tile b-toy ${levelClass}`}>
      <div className="toy-verdict">
        <div className="panel-heading">
          <ShieldQuestion size={18} />
          <h3>Hiring Signal</h3>
        </div>
        <p>{risk.label}</p>
        <small>{risk.summary}</small>
      </div>
      <div className="toy-scorecard">
        <span>{risk.score}</span>
        <small>risk confidence · {risk.confidence}</small>
      </div>
      <div className="toy-evidence">
        <EvidenceColumn title="Proof an interviewer can inspect" items={proof} empty="No strong proof surfaced yet." />
        <EvidenceColumn title="What may still read toy-like" items={watch} empty="No major toy-project caveats surfaced." />
      </div>
    </section>
  )
}

function EvidenceColumn({ title, items, empty }: { title: string; items: ToyProjectRisk['reasons']; empty: string }) {
  return (
    <div className="toy-column">
      <span>{title}</span>
      {items.length ? (
        items.map((item) => (
          <p className={`toy-reason ${item.sentiment === 'negative' ? 'negative' : 'positive'}`} key={`${item.title}-${item.evidence}`}>
            <strong>{item.title}</strong>
            <em>{item.evidence}</em>
          </p>
        ))
      ) : (
        <p className="toy-empty">{empty}</p>
      )}
    </div>
  )
}

function fallbackToyRisk(readinessScore: number, riskCount: number): ToyProjectRisk {
  const level = readinessScore >= 76 ? 'low' : readinessScore >= 50 ? 'medium' : 'high'
  return {
    level,
    label: level === 'low' ? 'Low toy-project risk' : level === 'medium' ? 'Medium toy-project risk' : 'High toy-project risk',
    summary: 'This inference uses readiness score and visible risk count because detailed project intelligence is unavailable for this result.',
    confidence: 'low',
    score: readinessScore,
    reasons: [
      { title: 'Readiness score', evidence: `${readinessScore}/100`, sentiment: readinessScore >= 70 ? 'positive' : 'negative' },
      { title: 'Risk count', evidence: `${riskCount} visible risk signals`, sentiment: riskCount <= 2 ? 'positive' : 'negative' },
    ],
  }
}

function ProductionSignals({ result }: { result: AnalyzeResponse }) {
  const checklist = result.readiness.checklist
  const groups = PRODUCTION_SIGNAL_GROUPS.map((group) => {
    const items = group.checks.map((name) => checklist.find((item) => item.name === name)).filter((item): item is ReadinessChecklistItem => Boolean(item))
    const passed = items.filter((item) => item.passed).length
    return { ...group, items, passed, total: items.length }
  })
  const passedTotal = groups.reduce((sum, group) => sum + group.passed, 0)
  const total = groups.reduce((sum, group) => sum + group.total, 0)
  const architecture = result.analysis.project_intelligence?.architecture.summary ?? 'Static architecture inference is not available for this scan.'
  const verdict = passedTotal >= Math.ceil(total * 0.75)
    ? 'Production-shaped project'
    : passedTotal >= Math.ceil(total * 0.5)
      ? 'Promising, but still needs proof'
      : 'Likely toy-project risk'

  return (
    <section className="card b-tile b-prod">
      <div className="production-readout">
        <div>
          <div className="panel-heading">
            <ShieldCheck size={18} />
            <h3>Production Signals</h3>
          </div>
          <p>{verdict}</p>
          <small>{architecture}</small>
        </div>
        <span className="production-score">
          {passedTotal}/{total}
          <small>signals</small>
        </span>
      </div>
      <div className="production-grid">
        {groups.map((group) => (
          <article className={`signal-card ${group.passed === group.total ? 'strong' : group.passed > 0 ? 'partial' : 'weak'}`} key={group.label}>
            <div className="signal-top">
              <strong>{group.label}</strong>
              <span>{group.passed}/{group.total}</span>
            </div>
            <p>{group.description}</p>
            <div className="signal-dots" aria-label={`${group.passed} of ${group.total} production checks passed`}>
              {group.items.map((item) => (
                <i className={item.passed ? 'pass' : 'fail'} key={item.name} title={item.name} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

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
