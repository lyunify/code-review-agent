import { ClipboardList, Gauge } from 'lucide-react'
import type { AnalyzeResponse } from '../types'
import { ChecklistRow, Metric } from './Shared'

export function RubricView({ result }: { result: AnalyzeResponse }) {
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
