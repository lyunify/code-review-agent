import { ClipboardList, Gauge, History, ListChecks, Sparkles } from 'lucide-react'
import type { HistoryRecord } from '../types'
import type { View } from '../uiTypes'

export function Sidebar({
  history,
  activeView,
  loadingHistoryId,
  onViewChange,
  onSelectHistory,
}: {
  history: HistoryRecord[]
  activeView: View
  loadingHistoryId: number | null
  onViewChange: (view: View) => void
  onSelectHistory: (record: HistoryRecord) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">CRA</div>
        <div>
          <strong>Code Review Agent</strong>
          <span>SDE intern project reviewer</span>
        </div>
      </div>

      <nav className="side-nav">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => onViewChange('dashboard')}>
          <Gauge size={18} />
          Review dashboard
        </button>
        <button className={activeView === 'rubric' ? 'active' : ''} onClick={() => onViewChange('rubric')}>
          <ClipboardList size={18} />
          Readiness rubric
        </button>
        <button className={activeView === 'action' ? 'active' : ''} onClick={() => onViewChange('action')}>
          <ListChecks size={18} />
          Action plan
        </button>
        <button className={activeView === 'mentor' ? 'active' : ''} onClick={() => onViewChange('mentor')}>
          <Sparkles size={18} />
          AI mentor
        </button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-title">
          <History size={16} />
          Recent scans
        </div>
        {history.length === 0 ? (
          <p className="sidebar-empty">No saved scans yet.</p>
        ) : (
          <div className="sidebar-history">
            {history.slice(0, 4).map((item) => (
              <button
                className="sidebar-history-row"
                key={item.id}
                onClick={() => onSelectHistory(item)}
                disabled={loadingHistoryId !== null}
              >
                <span>{item.repo_url.replace('https://github.com/', '')}</span>
                <small>{loadingHistoryId === item.id ? 'Loading saved report...' : `${item.risk_count} risks`}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
