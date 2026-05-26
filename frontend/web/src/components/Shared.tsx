import type { ReactNode } from 'react'
import type { ReadinessChecklistItem } from '../types'

export function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export function ChecklistRow({ item }: { item: ReadinessChecklistItem }) {
  return (
    <div className="check-row">
      <span className={item.passed ? 'dot pass' : 'dot fail'} />
      <div>
        <strong>{item.name}</strong>
        <p>{item.recommendation}</p>
      </div>
      <span className="points">{item.points}</span>
    </div>
  )
}
