import type { AnalyzeResponse } from '../types'

export function MentorView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="view-header">
        <p className="view-header-eyebrow">Interview Coach</p>
        <div className="view-header-row">
          <h2 className="view-header-title">Practice talking about this project.</h2>
        </div>
      </div>

      {/* Coach's assessment — compact, not the focus */}
      <div className="coach-assessment">
        <span className="coach-label">Mentor's take</span>
        <p>{result.mentor_feedback.mentor_summary}</p>
      </div>

      {/* Talking points — resume bullets as ammo for all answers */}
      <section className="panel">
        <p className="panel-eyebrow" style={{ marginBottom: 14 }}>Your strongest talking points</p>
        <div className="bullet-list">
          {result.mentor_feedback.resume_bullets.map((bullet, i) => (
            <div className="bullet-item" key={bullet}>
              <span className="bullet-num">{String(i + 1).padStart(2, '0')}</span>
              <p className="bullet-text">{bullet}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interview questions with STAR framework */}
      <p className="panel-eyebrow" style={{ marginBottom: 12 }}>
        {result.mentor_feedback.interview_questions.length} likely interview questions
      </p>

      <div className="interview-cards">
        {result.mentor_feedback.interview_questions.map((q, i) => (
          <article className="interview-card" key={q.question}>
            <div className="interview-card-q">
              <span className="interview-q-num">Q{i + 1}</span>
              <p className="interview-q-text">{q.question}</p>
            </div>
            <div className="star-grid">
              <div className="star-row">
                <span className="star-label">Situation</span>
                <p className="star-hint">{q.situation}</p>
              </div>
              <div className="star-row">
                <span className="star-label">Task</span>
                <p className="star-hint">{q.task}</p>
              </div>
              <div className="star-row">
                <span className="star-label">Action</span>
                <p className="star-hint">{q.action}</p>
              </div>
              <div className="star-row">
                <span className="star-label">Result</span>
                <p className="star-hint">{q.result}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
