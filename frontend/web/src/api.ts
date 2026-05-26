import type { AnalyzeResponse, HistoryDetail, HistoryRecord } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export function normalizeRepoUrl(repoUrl: string): string {
  const cleaned = repoUrl.trim()
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    return `https://${cleaned}`
  }
  return cleaned
}

export async function analyzeRepository(repoUrl: string): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repo_url: normalizeRepoUrl(repoUrl) }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response.json()
}

export async function fetchHistory(): Promise<HistoryRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/history`)
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  const payload = await response.json()
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
    return 'Cannot reach the backend API. Make sure FastAPI is running on http://127.0.0.1:8000.'
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
