import { FileText, Gauge, Github, ListChecks, ShieldCheck } from 'lucide-react'
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
      ? 'Check the rubric behind the resume-readiness verdict.'
      : activeView === 'action'
        ? 'Turn weak repo signals into a focused fix plan.'
        : 'Find out if this project is ready for your internship resume.'

  return (
    <section className="empty-workbench">
      <div className="empty-card">
        <ShieldCheck size={30} />
        <h2>{title}</h2>
        <p>
          Start with a public GitHub repository to inspect production signals, toy-project risk, resume proof,
          prioritized fixes, and interview talking points.
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
            <strong>Verdict</strong>
            <span>Resume readiness and toy-project risk</span>
          </div>
          <div>
            <ListChecks size={19} />
            <strong>Action plan</strong>
            <span>Evidence-backed next fixes</span>
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
