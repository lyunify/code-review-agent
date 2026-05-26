import { Github, Loader2 } from 'lucide-react'

export function CommandBar({
  repoUrl,
  isLoading,
  onRepoUrlChange,
  onAnalyze,
}: {
  repoUrl: string
  isLoading: boolean
  onRepoUrlChange: (repoUrl: string) => void
  onAnalyze: () => void
}) {
  return (
    <header className="command-bar">
      <p className="command-bar-hero">Is your repo interview-ready?</p>
      <p className="command-bar-sub">
        Paste a public GitHub URL to get your SDE intern readiness score.
      </p>
      <div className="repo-command">
        <Github size={16} color="var(--text-muted)" />
        <input
          aria-label="GitHub repository URL"
          value={repoUrl}
          onChange={(event) => onRepoUrlChange(event.target.value)}
          placeholder="github.com/username/project"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading && repoUrl.trim().length > 0) onAnalyze()
          }}
        />
        <button onClick={onAnalyze} disabled={isLoading || repoUrl.trim().length === 0}>
          {isLoading ? <Loader2 className="spin" size={16} /> : null}
          Analyze
        </button>
      </div>
    </header>
  )
}
