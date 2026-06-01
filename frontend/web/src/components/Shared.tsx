import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ReadinessChecklistItem } from '../types'

/* ── Score band + grade helpers ──────────────────────────── */
export function scoreBand(score: number): 'ready' | 'mid' | 'low' {
  if (score >= 80) return 'ready'
  if (score >= 60) return 'mid'
  return 'low'
}

export function scoreGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'A-'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

const BAND_COLOR: Record<string, string> = {
  ready: 'var(--ready)',
  mid: 'var(--mid)',
  low: 'var(--low)',
}

/* ── Animated radial score gauge ─────────────────────────── */
export function ScoreGauge({
  score,
  size = 150,
  stroke = 10,
  label = 'Resume score',
}: {
  score: number
  size?: number
  stroke?: number
  label?: string
}) {
  const [val, setVal] = useState(0)
  const band = scoreBand(score)
  const color = BAND_COLOR[band]
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  useEffect(() => {
    let raf = 0
    let start = 0
    const duration = 1100
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(score * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  return (
    <div className="gauge-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - val / 100)}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset .1s linear' }}
        />
      </svg>
      <div className="gauge-num">
        <b style={{ color }}>{val}</b>
        <small>{label}</small>
      </div>
    </div>
  )
}

/* ── Mono eyebrow / kicker ───────────────────────────────── */
export function Eyebrow({ children, green }: { children: ReactNode; green?: boolean }) {
  return (
    <span className={`eyebrow${green ? ' green' : ''}`}>
      <i className="tick" />
      {children}
    </span>
  )
}

/* ── Existing shared components (unchanged API) ──────────── */
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
