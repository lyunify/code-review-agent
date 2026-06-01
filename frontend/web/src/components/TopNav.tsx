import { Github, History, LogIn, LogOut, User } from 'lucide-react'
import type { CurrentUser } from '../types'

type TopNavProps = {
  currentUser: CurrentUser | null
  onDevLogin: () => void
  onLogout: () => void
  onHistoryOpen: () => void
}

export function TopNav({ currentUser, onDevLogin, onLogout, onHistoryOpen }: TopNavProps) {
  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <span className="top-nav-logo">repo-ready.</span>
        <span className="top-nav-tag">AI · SDE intern scorer</span>
      </div>
      <div className="top-nav-right">
        {currentUser ? (
          <>
            <span className="top-nav-user" aria-label={`Signed in as ${currentUser.username}`}>
              <User size={13} />
              {currentUser.username}
            </span>
            <button className="top-nav-btn" onClick={onLogout} aria-label="Sign out">
              <LogOut size={14} />
              Sign out
            </button>
          </>
        ) : (
          <button className="top-nav-btn" onClick={onDevLogin} aria-label="Use dev sign in">
            <LogIn size={14} />
            Dev sign in
          </button>
        )}
        <a
          className="top-nav-link"
          href="https://github.com/lyunify/repo-ready"
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
