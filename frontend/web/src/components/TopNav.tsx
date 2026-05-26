import { History } from 'lucide-react'

export function TopNav({ onHistoryOpen }: { onHistoryOpen: () => void }) {
  return (
    <nav className="top-nav">
      <span className="top-nav-logo">repo-ready.</span>
      <button className="top-nav-btn" onClick={onHistoryOpen}>
        <History size={14} />
        History
      </button>
    </nav>
  )
}
