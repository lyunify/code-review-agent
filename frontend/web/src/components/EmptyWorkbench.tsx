import { FileText, Gauge, Github, ListChecks, Sparkles } from 'lucide-react'
import type { HistoryRecord } from '../types'
import type { View } from '../uiTypes'

export function EmptyWorkbench({
  history,
  activeView,
  onTrySampleRepo,
}: {
  history: HistoryRecord[]
  activeView: View
  onTrySampleRepo: () => void
}) {
  const title =
    activeView === 'rubric'
      ? 'Run a repository review to inspect the readiness rubric.'
      : activeView === 'action'
        ? 'Run a repository review to generate a prioritized action plan.'
        : activeView === 'mentor'
          ? 'Run a repository review to generate AI mentor feedback.'
          : 'Run a repository review to generate the workspace.'

  return (
    <section className="empty-workbench">
      <div className="empty-card">
        <Sparkles size={30} />
        <h2>{title}</h2>
        <p>
          Start with a public GitHub repository to generate a readiness score, prioritized action plan, resume bullets,
          interview prep, and a saved report you can revisit later.
        </p>
        <div className="empty-actions">
          <button onClick={onTrySampleRepo}>
            <Github size={17} />
            View demo result
          </button>
        </div>
        <div className="empty-feature-grid">
          <div>
            <Gauge size={19} />
            <strong>Score</strong>
            <span>Resume-readiness rubric</span>
          </div>
          <div>
            <ListChecks size={19} />
            <strong>Action plan</strong>
            <span>Prioritized next fixes</span>
          </div>
          <div>
            <FileText size={19} />
            <strong>Report</strong>
            <span>Markdown export</span>
          </div>
        </div>
        {history.length > 0 && <span>{history.length} previous scans are available in the sidebar.</span>}
      </div>
    </section>
  )
}
