import { Loader2 } from 'lucide-react'

export function LoadingWorkbench({ repoUrl }: { repoUrl: string }) {
  const steps = [
    { label: 'Clone repository', detail: 'Fetch public GitHub files for analysis.' },
    { label: 'Scan project structure', detail: 'Inspect README, tests, docs, dependencies, and file health.' },
    { label: 'Calculate readiness', detail: 'Score the repo against the SDE intern resume rubric.' },
    { label: 'Generate mentor output', detail: 'Create action plan, resume bullets, and interview prep.' },
  ]

  return (
    <section className="panel">
      <div>
        <p className="panel-eyebrow">Analysis pipeline</p>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 4 }}>
          Reviewing {repoUrl.replace('https://github.com/', '')}
        </p>
      </div>
      <div className="loading-steps">
        {steps.map((step, index) => (
          <div className="loading-step" key={step.label}>
            <span>{index === 0 ? <Loader2 className="spin" size={17} /> : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
