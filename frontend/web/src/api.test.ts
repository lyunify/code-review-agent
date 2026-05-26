import { describe, expect, it } from 'vitest'
import { normalizeRepoUrl } from './api'

describe('normalizeRepoUrl', () => {
  it('adds https scheme when missing', () => {
    expect(normalizeRepoUrl('github.com/lyunify/code-review-agent')).toBe(
      'https://github.com/lyunify/code-review-agent',
    )
  })

  it('preserves existing https scheme', () => {
    expect(normalizeRepoUrl('https://github.com/lyunify/code-review-agent')).toBe(
      'https://github.com/lyunify/code-review-agent',
    )
  })
})
