import { Github, History } from 'lucide-react'

export function TopNav({ onHistoryOpen }: { onHistoryOpen: () => void }) {
  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <span className="top-nav-logo">repo-ready.</span>
        <span className="top-nav-tag">AI · SDE intern scorer</span>
      </div>
      <div className="top-nav-right">
        <a
          className="top-nav-link"
          href="https://github.com/lyunify/code-review-agent"
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
        >
          <Github size={13} />
          GitHub
        </a>
        <button className="top-nav-btn" onClick={onHistoryOpen} aria-label="Open recent scans">
          <History size={14} />
          History
        </button>
      </div>
    </nav>
  )
}
