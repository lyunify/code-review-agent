import { ClipboardList, Gauge, Github, History, ListChecks, LogIn, LogOut, Sparkles, User } from 'lucide-react'
import type { AnalyzeResponse, CurrentUser, HistoryRecord } from '../types'
import type { View } from '../uiTypes'
import { scoreBand } from './Shared'

export function Sidebar({
  result = null,
  history,
  activeView,
  loadingHistoryId,
  currentUser = null,
  onViewChange,
  onSelectHistory,
  onOpenHistory,
  onDevLogin,
  onLogout,
}: {
  result?: AnalyzeResponse | null
  history: HistoryRecord[]
  activeView: View
  loadingHistoryId: number | null
  currentUser?: CurrentUser | null
  onViewChange: (view: View) => void
  onSelectHistory: (record: HistoryRecord) => void
  onOpenHistory?: () => void
  onDevLogin?: () => void
  onLogout?: () => void
}) {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="wordmark">repo<span className="dot">·</span>ready</span>
      </div>

      {result && (
        <div className="sb-repo">
          <span className={`sb-score ${scoreBand(result.readiness.score)}`}>{result.readiness.score}</span>
          <span className="sb-rmeta">
            <b>{result.github_metadata.full_name || result.repo_url.replace('https://github.com/', '')}</b>
            <span>{result.readiness.status}</span>
          </span>
        </div>
      )}

      <nav className="side-nav">
        <span className="sb-label">Workspace</span>
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
          Interview prep
        </button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-title">
          <History size={14} />
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

      <div className="sb-foot">
        {onOpenHistory && (
          <button onClick={onOpenHistory}>
            <History size={16} />
            All scans
          </button>
        )}
        <a href="https://github.com/lyunify/repo-ready" target="_blank" rel="noreferrer">
          <Github size={16} />
          GitHub
        </a>
        {currentUser ? (
          <button className="sb-user" onClick={onLogout} title="Sign out">
            <LogOut size={16} />
            {currentUser.username}
          </button>
        ) : onDevLogin ? (
          <button onClick={onDevLogin}>
            <LogIn size={16} />
            Dev sign in
          </button>
        ) : (
          <span className="sb-user" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', color: 'var(--text-faint)', fontSize: 13 }}>
            <User size={16} />
            Guest
          </span>
        )}
      </div>
    </aside>
  )
}
