import type { AnalyzeResponse } from '../types'

export function ActionPlanView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="view-header">
        <p className="view-header-eyebrow">Action Plan</p>
        <div className="view-header-row">
          <h2 className="view-header-title">What to fix next.</h2>
          <span className="view-header-count">{result.action_plan.items.length} priority steps</span>
        </div>
      </div>

      <div className="action-plan-grid">
        {result.action_plan.items.map((item, index) => (
          <article className="action-step-card" key={`${item.title}-${index}`}>
            <span className="action-big-num">{String(index + 1).padStart(2, '0')}</span>
            <div className="action-card-body">
              <span className="action-card-category">{item.category}</span>
              <h3 className="action-card-title">{item.title}</h3>
              <div className="action-card-fields">
                <div className="action-card-field">
                  <span>Why</span>
                  <p>{item.why_it_matters}</p>
                </div>
                <div className="action-card-field">
                  <span>How</span>
                  <p>{item.how_to_improve}</p>
                </div>
                <div className="action-card-field">
                  <span>Resume</span>
                  <p>{item.resume_impact}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
