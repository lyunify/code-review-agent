import type { AnalyzeResponse } from '../types'

export function ActionPlanView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="repo-header panel">
        <div>
          <p className="eyebrow">Action plan</p>
          <h2>What should this student fix next?</h2>
        </div>
        <span className="status-pill ready">{result.action_plan.items.length} priority steps</span>
      </div>

      <div className="action-plan-grid">
        {result.action_plan.items.map((item, index) => (
          <article className="panel action-step" key={`${item.title}-${index}`}>
            <div className="action-step-index">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <div className="action-step-header">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
              </div>
              <dl>
                <div>
                  <dt>Why it matters</dt>
                  <dd>{item.why_it_matters}</dd>
                </div>
                <div>
                  <dt>How to improve</dt>
                  <dd>{item.how_to_improve}</dd>
                </div>
                <div>
                  <dt>Resume impact</dt>
                  <dd>{item.resume_impact}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
