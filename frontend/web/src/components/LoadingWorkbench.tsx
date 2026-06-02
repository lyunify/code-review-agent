import { CheckCircle2, Loader2 } from 'lucide-react'

export function LoadingWorkbench({ repoUrl, pollCount = 0 }: { repoUrl: string; pollCount?: number }) {
  const steps = [
    { label: 'Clone repository', detail: 'Fetch public GitHub files for analysis.' },
    { label: 'Scan project structure', detail: 'Inspect README, tests, docs, dependencies, and file health.' },
    { label: 'Evaluate production signals', detail: 'Check whether the repo looks runnable, tested, and full-stack.' },
    { label: 'Build fix plan', detail: 'Create resume bullets, interview prompts, and prioritized next fixes.' },
  ]

  // Advance one step per poll (every ~2s). Cap at last step.
  const activeStep = Math.min(pollCount, steps.length - 1)

  return (
    <section className="panel loading-shell">
      <div className="loading-orb">
        <span className="ring" />
        <span className="ring r2" />
        <span className="core" />
      </div>
      <p className="panel-eyebrow">Analysis pipeline</p>
      <p className="loading-repo">Reviewing {repoUrl.replace('https://github.com/', '')}</p>
      <div className="loading-steps">
        {steps.map((step, index) => {
          const state = index < activeStep ? 'is-done' : index === activeStep ? 'is-active' : ''
          return (
            <div className={`loading-step ${state}`} key={step.label}>
              <span>
                {index < activeStep ? (
                  <CheckCircle2 size={15} />
                ) : index === activeStep ? (
                  <Loader2 className="spin" size={15} />
                ) : (
                  index + 1
                )}
              </span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
