import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeRepository, fetchHistoryRecord, getFriendlyErrorMessage, normalizeRepoUrl } from './api'

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

describe('analyzeRepository', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('analyzeRepository polls until job is done', async () => {
    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, opts?: RequestInit) => {
        callCount++
        if (opts?.method === 'POST') {
          return new Response(JSON.stringify({ job_id: 'test-job-id' }), { status: 200 })
        }
        // First poll: running. Second poll: done.
        if (callCount <= 2) {
          return new Response(
            JSON.stringify({
              job_id: 'test-job-id',
              status: 'running',
              progress: 'Analyzing...',
              result: null,
              error: null,
            }),
            { status: 200 },
          )
        }
        return new Response(
          JSON.stringify({
            job_id: 'test-job-id',
            status: 'done',
            progress: 'Done',
            result: { repo_url: 'https://github.com/example/demo' },
            error: null,
          }),
          { status: 200 },
        )
      }),
    )
    vi.useFakeTimers()

    const promise = analyzeRepository('https://github.com/example/demo')
    // Advance past the 2-second poll interval twice
    await vi.runAllTimersAsync()

    const result = await promise
    expect(result.repo_url).toBe('https://github.com/example/demo')

    vi.useRealTimers()
  })
})

describe('fetchHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns records from history endpoint', async () => {
    const records = [{ id: 1, repo_url: 'https://github.com/a/b' }]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchHistory } = await import('./api')
    await expect(fetchHistory()).resolves.toEqual(records)
  })

  it('throws when response is not ok with array detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: [{ msg: 'Validation error' }] }),
      statusText: 'Bad Request',
    })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchHistory } = await import('./api')
    await expect(fetchHistory()).rejects.toThrow('Validation error')
  })

  it('throws when response is not ok with non-JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('not JSON') },
      statusText: 'Internal Server Error',
    })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchHistory } = await import('./api')
    await expect(fetchHistory()).rejects.toThrow('Internal Server Error')
  })
})

describe('getFriendlyErrorMessage', () => {
  it('explains backend connectivity failures', () => {
    expect(getFriendlyErrorMessage('Failed to fetch')).toBe(
      'Cannot reach the backend API. Please try again in a moment — the server may be starting up.',
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

  it('explains repository not found errors', () => {
    expect(getFriendlyErrorMessage('Repository not found')).toBe(
      'Could not access that repository. Make sure it is public and the URL is correct.',
    )
  })

  it('explains missing OpenAI API key errors', () => {
    expect(getFriendlyErrorMessage('Missing OPENAI_API_KEY')).toBe(
      'AI mentor feedback needs an OpenAI API key in backend/.env, but the static scanner can still run.',
    )
  })
})
