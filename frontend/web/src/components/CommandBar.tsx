import { ArrowRight, Github, Loader2 } from 'lucide-react'

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
      <div>
        <p className="eyebrow">Intern project readiness</p>
        <h1>Repository Review</h1>
      </div>
      <div className="repo-command">
        <Github size={18} />
        <input
          aria-label="GitHub repository URL"
          value={repoUrl}
          onChange={(event) => onRepoUrlChange(event.target.value)}
          placeholder="github.com/username/project"
        />
        <button onClick={onAnalyze} disabled={isLoading || repoUrl.trim().length === 0}>
          {isLoading ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
          Analyze
        </button>
      </div>
    </header>
  )
}
