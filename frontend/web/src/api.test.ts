import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHistoryRecord, getFriendlyErrorMessage, normalizeRepoUrl } from './api'

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
      github_metadata: {
        available: true,
        full_name: 'example/demo',
        description: null,
        topics: [],
        license_name: null,
        license_spdx_id: null,
        stars: 0,
        forks: 0,
        open_issues: 0,
        default_branch: 'main',
        homepage: null,
        has_homepage: false,
        is_archived: false,
        is_fork: false,
        created_at: null,
        updated_at: null,
        pushed_at: null,
      },
      report: { summary: 'Saved report', recommendations: [] },
      readiness: { score: 88, status: 'Almost ready', checklist: [], priority_fixes: [] },
      mentor_feedback: { mentor_summary: 'Saved mentor note', resume_bullets: [], interview_questions: [], next_steps: [] },
      action_plan: { items: [] },
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

describe('getFriendlyErrorMessage', () => {
  it('explains backend connectivity failures', () => {
    expect(getFriendlyErrorMessage('Failed to fetch')).toBe(
      'Cannot reach the backend API. Make sure FastAPI is running on http://127.0.0.1:8000.',
    )
  })

  it('explains invalid repository URLs', () => {
    expect(getFriendlyErrorMessage('Input should be a valid URL')).toBe(
      'Enter a public GitHub repository URL, for example https://github.com/owner/project.',
    )
  })

  it('preserves specific backend messages when no product copy matches', () => {
    expect(getFriendlyErrorMessage('Repository does not contain a README file.')).toBe(
      'Repository does not contain a README file.',
    )
  })
})
