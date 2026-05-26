import type { AnalyzeResponse } from '../types'

export function MentorView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="view-header">
        <p className="view-header-eyebrow">AI Mentor</p>
        <div className="view-header-row">
          <h2 className="view-header-title">Turn this repo into an interview story.</h2>
        </div>
      </div>

      <section className="panel">
        <p className="mentor-pull-quote">{result.mentor_feedback.mentor_summary}</p>
      </section>

      <section className="panel">
        <p className="panel-eyebrow" style={{ marginBottom: 16 }}>Resume Bullets</p>
        <div className="bullet-list">
          {result.mentor_feedback.resume_bullets.map((bullet, index) => (
            <div className="bullet-item" key={bullet}>
              <span className="bullet-num">{String(index + 1).padStart(2, '0')}</span>
              <p className="bullet-text">{bullet}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="panel-eyebrow" style={{ marginBottom: 16 }}>Interview Questions</p>
        <div className="bullet-list">
          {result.mentor_feedback.interview_questions.map((question, index) => (
            <div className="bullet-item" key={question}>
              <span className="bullet-num">Q{index + 1}</span>
              <p className="bullet-text">{question}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
