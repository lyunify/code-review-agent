import { Github, Loader2, Sparkles } from 'lucide-react'

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
      <p className="command-bar-hero">
        Is this project <em>resume-ready?</em>
      </p>
      <p className="command-bar-sub">Paste a public GitHub repo to see what looks production-shaped, what still reads toy-like, and what to fix next.</p>
      <div className="repo-command">
        <Github size={16} color="var(--text-faint)" />
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
          {isLoading ? <Loader2 className="spin" size={16} /> : <Sparkles size={15} />}
          Analyze
        </button>
      </div>
    </header>
  )
}
