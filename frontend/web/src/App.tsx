import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  analyzeRepository,
  devLogin,
  fetchCurrentUser,
  fetchHistory,
  fetchHistoryRecord,
  getFriendlyErrorMessage,
  logout,
} from './api'
import { ActionPlanView } from './components/ActionPlanView'
import { CommandBar } from './components/CommandBar'
import { Dashboard } from './components/Dashboard'
import { EmptyWorkbench } from './components/EmptyWorkbench'
import { HistoryDrawer } from './components/HistoryDrawer'
import { LoadingWorkbench } from './components/LoadingWorkbench'
import { RubricView } from './components/RubricView'
import { Sidebar } from './components/Sidebar'
import { getDemoAnalysisResult } from './demoData'
import type { AnalyzeResponse, CurrentUser, HistoryRecord } from './types'
import type { Tab, View } from './uiTypes'

const SAMPLE_REPO_URL = 'https://github.com/lyunify/repo-ready'
const THEME_KEY = 'repo-ready-theme'
type Theme = 'ivory' | 'dark'

function App() {
  const [repoUrl, setRepoUrl] = useState(SAMPLE_REPO_URL)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [activeTab, setActiveTab] = useState<Tab>('resume')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === 'undefined') return 'ivory'
    const savedTheme = localStorage.getItem(THEME_KEY)
    return savedTheme === 'dark' || savedTheme === 'ivory' ? savedTheme : 'ivory'
  })

  useEffect(() => {
    refreshSessionState()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'ivory' ? 'ivory' : ''
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  async function refreshSessionState() {
    try {
      const user = await fetchCurrentUser()
      setCurrentUser(user)
      setHistory(await fetchHistory())
    } catch {
      setCurrentUser(null)
      setHistory([])
    }
  }

  async function handleDevLogin() {
    setError(null)
    try {
      const user = await devLogin('katy')
      setCurrentUser(user)
      setHistory(await fetchHistory())
    } catch (err) {
      setError(getFriendlyErrorMessage(err instanceof Error ? err.message : 'Could not sign in'))
    }
  }

  async function handleLogout() {
    setError(null)
    try {
      await logout()
      setCurrentUser(null)
      setHistory(await fetchHistory())
    } catch (err) {
      setError(getFriendlyErrorMessage(err instanceof Error ? err.message : 'Could not sign out'))
    }
  }

  async function handleAnalyze(nextRepoUrl = repoUrl) {
    const targetRepoUrl = nextRepoUrl.trim()
    setRepoUrl(targetRepoUrl)
    setIsLoading(true)
    setPollCount(0)
    setError(null)
    try {
      const payload = await analyzeRepository(targetRepoUrl, setPollCount)
      setResult(payload)
      setActiveView('dashboard')
      setActiveTab('resume')
      setHistory(await fetchHistory())
    } catch (err) {
      setError(getFriendlyErrorMessage(err instanceof Error ? err.message : 'Analysis failed'))
    } finally {
      setIsLoading(false)
    }
  }

  function handleTrySampleRepo() {
    const demoResult = getDemoAnalysisResult()
    setRepoUrl(demoResult.repo_url)
    setResult(demoResult)
    setActiveView('dashboard')
    setActiveTab('resume')
    setError(null)
  }

  async function handleSelectHistory(record: HistoryRecord) {
    setLoadingHistoryId(record.id)
    setError(null)
    try {
      const payload = await fetchHistoryRecord(record.id)
      setResult(payload)
      setRepoUrl(payload.repo_url)
      setActiveView('dashboard')
      setActiveTab('resume')
    } catch (err) {
      setError(getFriendlyErrorMessage(err instanceof Error ? err.message : 'Could not load saved scan'))
    } finally {
      setLoadingHistoryId(null)
    }
  }

  return (
    <div className="app">
      <div className="aurora" />
      <div className="grain" />

      <Sidebar
        result={result}
        history={history}
        activeView={activeView}
        loadingHistoryId={loadingHistoryId}
        currentUser={currentUser}
        onViewChange={setActiveView}
        onSelectHistory={handleSelectHistory}
        onOpenHistory={() => setIsDrawerOpen(true)}
        onDevLogin={() => void handleDevLogin()}
        onLogout={() => void handleLogout()}
      />

      <HistoryDrawer
        isOpen={isDrawerOpen}
        history={history}
        loadingHistoryId={loadingHistoryId}
        onClose={() => setIsDrawerOpen(false)}
        onSelectHistory={handleSelectHistory}
      />

      <div className="canvas">
        <div className="canvas-top">
          <CommandBar
            repoUrl={repoUrl}
            isLoading={isLoading}
            onRepoUrlChange={setRepoUrl}
            onAnalyze={() => void handleAnalyze()}
          />
          <button
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'ivory' ? 'dark' : 'ivory'))}
            aria-label="Toggle light / dark theme"
            title={theme === 'ivory' ? 'Switch to dark' : 'Switch to light'}
          >
            {theme === 'ivory' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>

        <div className="canvas-body">
          {error && (
            <div className="error-banner">
              <AlertTriangle size={18} />
              <div>
                <strong>Analysis could not start</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <LoadingWorkbench repoUrl={repoUrl} pollCount={pollCount} />
          ) : result ? (
            activeView === 'dashboard' ? (
              <Dashboard result={result} activeTab={activeTab} onTabChange={setActiveTab} />
            ) : activeView === 'action' ? (
              <ActionPlanView result={result} />
            ) : activeView === 'rubric' ? (
              <RubricView result={result} />
            ) : (
              <Dashboard result={result} activeTab={activeTab} onTabChange={setActiveTab} />
            )
          ) : (
            <EmptyWorkbench history={history} activeView={activeView} onTrySampleRepo={handleTrySampleRepo} />
          )}
        </div>
      </div>
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

export default App
