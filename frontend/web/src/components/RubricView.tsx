import type { AnalyzeResponse } from '../types'
import { ChecklistRow } from './Shared'

export function RubricView({ result }: { result: AnalyzeResponse }) {
  const passedCount = result.readiness.checklist.filter((item) => item.passed).length

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
          <span className="rubric-passed-label">{passedCount}/{result.readiness.checklist.length} passed</span>
        </div>
      </div>

      <section className="panel">
        <div className="rubric-list">
          {result.readiness.checklist.map((item) => (
            <ChecklistRow item={item} key={item.name} />
          ))}
        </div>
      </section>
    </section>
  )
}
