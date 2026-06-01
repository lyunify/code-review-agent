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

      <div className="mentor-grid">
        {/* Sticky rail — the read + your strongest ammo */}
        <aside className="mentor-rail">
          <div className="coach-assessment">
            <span className="coach-label">Mentor's take</span>
            <p>{result.mentor_feedback.mentor_summary}</p>
          </div>
          <div className="panel">
            <p className="panel-eyebrow" style={{ marginBottom: 14 }}>
              Your strongest talking points
            </p>
            <div className="bullet-list">
              {result.mentor_feedback.resume_bullets.map((bullet, i) => (
                <div className="bullet-item" key={bullet}>
                  <span className="bullet-num">{String(i + 1).padStart(2, '0')}</span>
                  <p className="bullet-text">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Interview questions with STAR framework */}
        <div className="mentor-main">
          <p className="panel-eyebrow">
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
        </div>
      </div>
    </section>
  )
}
