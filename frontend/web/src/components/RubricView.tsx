import type { AnalyzeResponse, ReadinessChecklistItem } from '../types'
import { ChecklistRow } from './Shared'

type Group = { key: string; label: string; match: (name: string) => boolean }

const RUBRIC_GROUPS: Group[] = [
  { key: 'docs', label: 'Documentation', match: (n) => /readme|screenshot|usage|demo|tech stack|purpose|doc/i.test(n) },
  { key: 'test', label: 'Testing & quality', match: (n) => /test|risk|coverage|lint/i.test(n) },
  { key: 'hygiene', label: 'Project hygiene', match: (n) => /dependency|gitignore|env|license|architecture|secret/i.test(n) },
  { key: 'structure', label: 'Code structure', match: (n) => /long file|director|boundar|module|organi/i.test(n) },
]

export function RubricView({ result }: { result: AnalyzeResponse }) {
  const checklist = result.readiness.checklist
  const passedCount = checklist.filter((item) => item.passed).length

  const matched = new Set<string>()
  const groups = RUBRIC_GROUPS.map((group) => {
    const items = checklist.filter((item) => !matched.has(item.name) && group.match(item.name))
    items.forEach((item) => matched.add(item.name))
    return { ...group, items }
  })
  const leftover = checklist.filter((item) => !matched.has(item.name))
  if (leftover.length) groups.push({ key: 'more', label: 'Additional checks', match: () => false, items: leftover })

  const visibleGroups = groups.filter((group) => group.items.length > 0)

  return (
    <section className="single-view">
      <div className="view-header">
        <p className="view-header-eyebrow">Readiness Rubric</p>
        <div className="view-header-row">
          <h2 className="view-header-title">What makes this project resume-ready?</h2>
        </div>
      </div>

      <div className="rubric-hero">
        <span className="rubric-big-score">{result.readiness.score}</span>
        <div className="rubric-hero-meta">
          <span className="rubric-score-label">{result.readiness.score}/100</span>
          <span className="rubric-passed-label">
            {passedCount}/{checklist.length} passed
          </span>
        </div>
      </div>

      <div className="rgroups">
        {visibleGroups.map((group) => {
          const total = group.items.reduce((sum, item) => sum + item.points, 0)
          const earned = group.items.reduce((sum, item) => sum + (item.passed ? item.points : 0), 0)
          const pct = total ? Math.round((earned / total) * 100) : 100
          const barColor = pct === 100 ? 'var(--ready)' : pct >= 60 ? 'var(--mid)' : 'var(--low)'
          return (
            <div className="panel rgroup" key={group.key}>
              <div className="rgroup-head">
                <h3>{group.label}</h3>
                <div className="rgroup-prog">
                  <div className="rgroup-bar">
                    <i style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <span className="rgroup-pct">
                    {earned}/{total}
                  </span>
                </div>
              </div>
              {group.items.map((item: ReadinessChecklistItem) => (
                <ChecklistRow item={item} key={item.name} />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
