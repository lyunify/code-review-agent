import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHistoryRecord, normalizeRepoUrl } from './api'

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

describe('fetchHistoryRecord', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches one saved analysis by history id', async () => {
    const payload = {
      id: 7,
      repo_url: 'https://github.com/example/demo',
      created_at: '2026-05-25T12:00:00Z',
      analysis: { total_files: 2, total_directories: 1, languages: {}, largest_files: [], risks: [] },
      report: { summary: 'Saved report', recommendations: [] },
      readiness: { score: 88, status: 'Almost ready', checklist: [], priority_fixes: [] },
      mentor_feedback: { mentor_summary: 'Saved mentor note', resume_bullets: [], interview_questions: [], next_steps: [] },
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchHistoryRecord(7)).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/api/history/7')
  })
})
