import { describe, expect, it } from 'vitest'
import { getDemoAnalysisResult } from './demoData'

describe('getDemoAnalysisResult', () => {
  it('returns a complete resume readiness result for offline demos', () => {
    const result = getDemoAnalysisResult()

    expect(result.repo_url).toBe('https://github.com/lyunify/repo-ready')
    expect(result.readiness.score).toBeGreaterThanOrEqual(85)
    expect(result.mentor_feedback.resume_bullets.length).toBeGreaterThan(0)
    expect(result.action_plan.items.length).toBeGreaterThan(0)
    expect(result.analysis.languages.Python).toBeGreaterThan(0)
  })
})
