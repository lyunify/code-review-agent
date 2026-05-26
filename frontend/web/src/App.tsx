import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { analyzeRepository, fetchHistory, fetchHistoryRecord, getFriendlyErrorMessage } from './api'
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
import type { AnalyzeResponse, HistoryRecord } from './types'
import type { Tab, View } from './uiTypes'

const SAMPLE_REPO_URL = 'https://github.com/lyunify/code-review-agent'

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
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [])

  async function handleAnalyze(nextRepoUrl = repoUrl) {
    const targetRepoUrl = nextRepoUrl.trim()
    setRepoUrl(targetRepoUrl)
    setIsLoading(true)
    setError(null)
    try {
      const payload = await analyzeRepository(targetRepoUrl)
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
      <TopNav onHistoryOpen={() => setIsDrawerOpen(true)} />

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
          <LoadingWorkbench repoUrl={repoUrl} />
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
