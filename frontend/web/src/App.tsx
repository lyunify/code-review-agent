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
import { MentorView } from './components/MentorView'
import { RubricView } from './components/RubricView'
import { TopNav } from './components/TopNav'
import { getDemoAnalysisResult } from './demoData'
import type { AnalyzeResponse, CurrentUser, HistoryRecord } from './types'
import type { Tab, View } from './uiTypes'

const SAMPLE_REPO_URL = 'https://github.com/lyunify/repo-ready'

const VIEW_LABELS: Record<View, string> = {
  dashboard: 'Overview',
  mentor: 'AI Mentor',
  action: 'Action Plan',
  rubric: 'Rubric',
}

const VIEWS: View[] = ['dashboard', 'mentor', 'action', 'rubric']

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

  useEffect(() => {
    refreshSessionState()
  }, [])

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
    <main className="workspace">
      <TopNav
        currentUser={currentUser}
        onDevLogin={() => void handleDevLogin()}
        onLogout={() => void handleLogout()}
        onHistoryOpen={() => setIsDrawerOpen(true)}
      />

      <HistoryDrawer
        isOpen={isDrawerOpen}
        history={history}
        loadingHistoryId={loadingHistoryId}
        onClose={() => setIsDrawerOpen(false)}
        onSelectHistory={handleSelectHistory}
      />

      <div className="main-content">
        <CommandBar
          repoUrl={repoUrl}
          isLoading={isLoading}
          onRepoUrlChange={setRepoUrl}
          onAnalyze={() => void handleAnalyze()}
        />

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
          <>
            <nav className="view-tabs">
              {VIEWS.map((view) => (
                <button
                  key={view}
                  className={`view-tab${activeView === view ? ' active' : ''}`}
                  onClick={() => setActiveView(view)}
                >
                  {VIEW_LABELS[view]}
                </button>
              ))}
            </nav>

            {activeView === 'dashboard' ? (
              <Dashboard result={result} activeTab={activeTab} onTabChange={setActiveTab} />
            ) : activeView === 'action' ? (
              <ActionPlanView result={result} />
            ) : activeView === 'rubric' ? (
              <RubricView result={result} />
            ) : (
              <MentorView result={result} />
            )}
          </>
        ) : (
          <EmptyWorkbench history={history} activeView={activeView} onTrySampleRepo={handleTrySampleRepo} />
        )}
      </div>
    </main>
  )
}

export default App
