import { FileQuestion, MessageSquareText, Sparkles } from 'lucide-react'
import type { AnalyzeResponse } from '../types'

export function MentorView({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="single-view">
      <div className="repo-header panel">
        <div>
          <p className="eyebrow">AI mentor</p>
          <h2>Turn this repo into an interview story.</h2>
        </div>
        <span className="status-pill ready">OpenAI-backed</span>
      </div>

      <section className="panel mentor-panel mentor-page">
        <div className="panel-heading">
          <MessageSquareText size={19} />
          <h3>Mentor summary</h3>
        </div>
        <p>{result.mentor_feedback.mentor_summary}</p>
      </section>

      <div className="mentor-page-grid">
        <article className="panel">
          <div className="panel-heading">
            <Sparkles size={19} />
            <h3>Resume bullets</h3>
          </div>
          <div className="card-list">
            {result.mentor_feedback.resume_bullets.map((bullet, index) => (
              <div className="content-card" key={bullet}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{bullet}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <FileQuestion size={19} />
            <h3>Interview questions</h3>
          </div>
          <div className="card-list">
            {result.mentor_feedback.interview_questions.map((question, index) => (
              <div className="content-card" key={question}>
                <FileQuestion size={18} />
                <p>
                  <strong>Q{index + 1}.</strong> {question}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
