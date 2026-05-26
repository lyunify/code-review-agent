import type { AnalyzeResponse, HistoryRecord } from './types'

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
