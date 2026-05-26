import type { AnalyzeResponse, HistoryDetail, HistoryRecord, JobStatusResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export function normalizeRepoUrl(repoUrl: string): string {
  const cleaned = repoUrl.trim()
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    return `https://${cleaned}`
  }
  return cleaned
}

export async function analyzeRepository(repoUrl: string, onPoll?: (count: number) => void): Promise<AnalyzeResponse> {
  const startResponse = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: normalizeRepoUrl(repoUrl) }),
  })
  if (!startResponse.ok) {
    throw new Error(await getErrorMessage(startResponse))
  }
  const { job_id } = (await startResponse.json()) as { job_id: string }
  return pollJob(job_id, onPoll)
}

async function pollJob(jobId: string, onPoll?: (count: number) => void): Promise<AnalyzeResponse> {
  const MAX_POLLS = 300 // 10 minutes at 2s intervals
  for (let poll = 0; poll < MAX_POLLS; poll++) {
    onPoll?.(poll)
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
    if (!response.ok) {
      throw new Error(await getErrorMessage(response))
    }
    const job = (await response.json()) as JobStatusResponse
    if (job.status === 'done' && job.result !== null) {
      return job.result
    }
    if (job.status === 'failed') {
      throw new Error(job.error ?? 'Analysis failed')
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Analysis timed out after 10 minutes')
}

export async function fetchHistory(): Promise<HistoryRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/history`)
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  const payload = (await response.json()) as { records: HistoryRecord[] }
  return payload.records
}

export async function fetchHistoryRecord(recordId: number): Promise<HistoryDetail> {
  const response = await fetch(`${API_BASE_URL}/api/history/${recordId}`)
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  return response.json()
}

export function getFriendlyErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Cannot reach the backend API. Please try again in a moment — the server may be starting up.'
  }
  if (normalized.includes('valid url') || normalized.includes('url scheme')) {
    return 'Enter a public GitHub repository URL, for example https://github.com/owner/project.'
  }
  if (normalized.includes('repository not found') || normalized.includes('could not read from remote repository')) {
    return 'Could not access that repository. Make sure it is public and the URL is correct.'
  }
  if (normalized.includes('openai_api_key') || normalized.includes('api key')) {
    return 'AI mentor feedback needs an OpenAI API key in backend/.env, but the static scanner can still run.'
  }
  return message
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    if (typeof payload.detail === 'string') {
      return payload.detail
    }
    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      return payload.detail[0].msg ?? 'Request failed'
    }
  } catch {
    return response.statusText
  }
  return response.statusText
}
