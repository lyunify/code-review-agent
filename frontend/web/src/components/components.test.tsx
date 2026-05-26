import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { AnalyzeResponse, HistoryRecord, ReadinessChecklistItem } from '../types'
import { ActionPlanView } from './ActionPlanView'
import { CommandBar } from './CommandBar'
import { Dashboard } from './Dashboard'
import { EmptyWorkbench } from './EmptyWorkbench'
import { LoadingWorkbench } from './LoadingWorkbench'
import { MentorView } from './MentorView'
import { RubricView } from './RubricView'
import { Sidebar } from './Sidebar'
import { Metric, ChecklistRow } from './Shared'

afterEach(cleanup)

// Minimal AnalyzeResponse fixture
const mockResult: AnalyzeResponse = {
  repo_url: 'https://github.com/example/demo',
  analysis: {
    total_files: 42,
    total_directories: 5,
    languages: { TypeScript: 20, Python: 10 },
    largest_files: [],
    risks: [
      { severity: 'HIGH', message: 'No tests found', path: 'src/' },
    ],
  },
  github_metadata: {
    available: true,
    full_name: 'example/demo',
    description: 'A demo repo',
    topics: ['react', 'typescript'],
    license_name: 'MIT License',
    license_spdx_id: 'MIT',
    stars: 10,
    forks: 2,
    open_issues: 1,
    default_branch: 'main',
    homepage: 'https://example.com',
    has_homepage: true,
    is_archived: false,
    is_fork: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    pushed_at: '2025-01-01T00:00:00Z',
  },
  readiness: {
    score: 72,
    status: 'Getting there',
    checklist: [
      { name: 'README', passed: true, points: 10, recommendation: 'Good README' },
      { name: 'Tests', passed: false, points: 20, recommendation: 'Add tests' },
    ],
    priority_fixes: ['Add unit tests', 'Add CI pipeline', 'Document APIs', 'Add LICENSE'],
  },
  report: {
    summary: 'A well-structured project',
    recommendations: ['Add more tests'],
  },
  mentor_feedback: {
    mentor_summary: 'Good foundational project, needs more tests.',
    resume_bullets: ['Built a full-stack app', 'Implemented REST API'],
    interview_questions: ['How did you structure the backend?', 'What testing strategy did you use?'],
    next_steps: ['Add tests', 'Add CI'],
  },
  action_plan: {
    items: [
      {
        title: 'Add unit tests',
        category: 'Testing',
        why_it_matters: 'Increases confidence',
        how_to_improve: 'Use pytest',
        resume_impact: 'Shows quality focus',
      },
    ],
  },
}

describe('ActionPlanView', () => {
  it('renders action plan items', () => {
    render(<ActionPlanView result={mockResult} />)
    expect(screen.getByText('Add unit tests')).toBeDefined()
    expect(screen.getByText('Testing')).toBeDefined()
    expect(screen.getByText('1 priority steps')).toBeDefined()
  })
})

describe('CommandBar', () => {
  it('renders with repo URL and calls handlers', () => {
    const onRepoUrlChange = vi.fn()
    const onAnalyze = vi.fn()
    render(
      <CommandBar
        repoUrl="https://github.com/example/demo"
        isLoading={false}
        onRepoUrlChange={onRepoUrlChange}
        onAnalyze={onAnalyze}
      />,
    )
    expect(screen.getByDisplayValue('https://github.com/example/demo')).toBeDefined()
    fireEvent.click(screen.getByText('Analyze'))
    expect(onAnalyze).toHaveBeenCalledOnce()
  })

  it('shows loading state when isLoading is true', () => {
    render(
      <CommandBar
        repoUrl="https://github.com/example/demo"
        isLoading={true}
        onRepoUrlChange={vi.fn()}
        onAnalyze={vi.fn()}
      />,
    )
    const button = screen.getByText('Analyze').closest('button')
    expect(button).toBeTruthy()
    expect(button!.disabled).toBe(true)
  })

  it('disables button when repoUrl is empty', () => {
    render(
      <CommandBar
        repoUrl=""
        isLoading={false}
        onRepoUrlChange={vi.fn()}
        onAnalyze={vi.fn()}
      />,
    )
    const button = screen.getByText('Analyze').closest('button')
    expect(button!.disabled).toBe(true)
  })
})

describe('Dashboard', () => {
  it('renders the repo name and score', () => {
    render(<Dashboard result={mockResult} activeTab="resume" onTabChange={vi.fn()} />)
    expect(screen.getByText('example/demo')).toBeDefined()
    expect(screen.getAllByText(/72\/100/i).length).toBeGreaterThan(0)
  })

  it('renders resume bullets tab content', () => {
    render(<Dashboard result={mockResult} activeTab="resume" onTabChange={vi.fn()} />)
    expect(screen.getByText('Built a full-stack app')).toBeDefined()
  })

  it('renders interview tab content', () => {
    render(<Dashboard result={mockResult} activeTab="interview" onTabChange={vi.fn()} />)
    expect(screen.getByText(/How did you structure the backend/)).toBeDefined()
  })

  it('renders risks tab content', () => {
    render(<Dashboard result={mockResult} activeTab="risks" onTabChange={vi.fn()} />)
    expect(screen.getByText(/No tests found/)).toBeDefined()
  })

  it('renders risks tab with no risks', () => {
    const noRiskResult = {
      ...mockResult,
      analysis: { ...mockResult.analysis, risks: [] },
    }
    render(<Dashboard result={noRiskResult} activeTab="risks" onTabChange={vi.fn()} />)
    expect(screen.getByText(/No risk signals found/)).toBeDefined()
  })

  it('calls onTabChange when tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<Dashboard result={mockResult} activeTab="resume" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByText('Interview prep'))
    expect(onTabChange).toHaveBeenCalledWith('interview')
  })

  it('shows ready status pill for high score', () => {
    const highScoreResult = { ...mockResult, readiness: { ...mockResult.readiness, score: 90, status: 'Ready' } }
    render(<Dashboard result={highScoreResult} activeTab="resume" onTabChange={vi.fn()} />)
    expect(screen.getByText('Ready')).toBeDefined()
  })

  it('shows github metadata including topics', () => {
    render(<Dashboard result={mockResult} activeTab="resume" onTabChange={vi.fn()} />)
    expect(screen.getByText('react')).toBeDefined()
    expect(screen.getByText('typescript')).toBeDefined()
  })

  it('shows Missing for null description metadata', () => {
    const noDescResult = {
      ...mockResult,
      github_metadata: { ...mockResult.github_metadata, description: null },
    }
    render(<Dashboard result={noDescResult} activeTab="resume" onTabChange={vi.fn()} />)
    // Description Missing label should appear
    const items = screen.getAllByText('Missing')
    expect(items.length).toBeGreaterThan(0)
  })
})

describe('EmptyWorkbench', () => {
  it('renders default message with no history', () => {
    render(<EmptyWorkbench history={[]} activeView="dashboard" onTrySampleRepo={vi.fn()} />)
    expect(screen.getByText(/Run a repository review to generate the workspace/)).toBeDefined()
  })

  it('shows rubric message for rubric view', () => {
    render(<EmptyWorkbench history={[]} activeView="rubric" onTrySampleRepo={vi.fn()} />)
    expect(screen.getByText('Run a repository review to inspect the readiness rubric.')).toBeDefined()
  })

  it('shows action plan message for action view', () => {
    render(<EmptyWorkbench history={[]} activeView="action" onTrySampleRepo={vi.fn()} />)
    expect(screen.getByText('Run a repository review to generate a prioritized action plan.')).toBeDefined()
  })

  it('shows mentor message for mentor view', () => {
    render(<EmptyWorkbench history={[]} activeView="mentor" onTrySampleRepo={vi.fn()} />)
    expect(screen.getByText(/AI mentor feedback/)).toBeDefined()
  })

  it('shows history count when history exists', () => {
    const history: HistoryRecord[] = [
      { id: 1, repo_url: 'https://github.com/a/b', created_at: '2025-01-01', total_files: 5, total_directories: 2, language_count: 1, risk_count: 0, summary: 'ok' },
      { id: 2, repo_url: 'https://github.com/c/d', created_at: '2025-01-02', total_files: 10, total_directories: 3, language_count: 2, risk_count: 1, summary: 'ok' },
    ]
    render(<EmptyWorkbench history={history} activeView="dashboard" onTrySampleRepo={vi.fn()} />)
    expect(screen.getByText(/2 previous scans/)).toBeDefined()
  })

  it('calls onTrySampleRepo when demo button clicked', () => {
    const onTrySampleRepo = vi.fn()
    render(<EmptyWorkbench history={[]} activeView="dashboard" onTrySampleRepo={onTrySampleRepo} />)
    fireEvent.click(screen.getByText('View demo result'))
    expect(onTrySampleRepo).toHaveBeenCalledOnce()
  })
})

describe('LoadingWorkbench', () => {
  it('renders loading steps with the repo URL', () => {
    render(<LoadingWorkbench repoUrl="https://github.com/example/demo" />)
    expect(screen.getByText(/Reviewing/)).toBeDefined()
    expect(screen.getByText('Clone repository')).toBeDefined()
    expect(screen.getByText('Scan project structure')).toBeDefined()
  })
})

describe('MentorView', () => {
  it('renders mentor summary and bullets', () => {
    render(<MentorView result={mockResult} />)
    expect(screen.getByText('Good foundational project, needs more tests.')).toBeDefined()
    expect(screen.getByText('Built a full-stack app')).toBeDefined()
    expect(screen.getByText(/How did you structure the backend/)).toBeDefined()
  })
})

describe('RubricView', () => {
  it('renders rubric checklist and score', () => {
    render(<RubricView result={mockResult} />)
    expect(screen.getAllByText(/72\/100/i).length).toBeGreaterThan(0)
    expect(screen.getByText('README')).toBeDefined()
    expect(screen.getByText('Tests')).toBeDefined()
    expect(screen.getByText('1/2 passed')).toBeDefined()
  })
})

describe('Sidebar', () => {
  it('renders navigation links', () => {
    render(
      <Sidebar
        history={[]}
        activeView="dashboard"
        loadingHistoryId={null}
        onViewChange={vi.fn()}
        onSelectHistory={vi.fn()}
      />,
    )
    expect(screen.getByText('Review dashboard')).toBeDefined()
    expect(screen.getByText('Readiness rubric')).toBeDefined()
    expect(screen.getByText('No saved scans yet.')).toBeDefined()
  })

  it('renders history items when available', () => {
    const history: HistoryRecord[] = [
      { id: 1, repo_url: 'https://github.com/a/b', created_at: '2025-01-01', total_files: 5, total_directories: 2, language_count: 1, risk_count: 3, summary: 'ok' },
    ]
    render(
      <Sidebar
        history={history}
        activeView="dashboard"
        loadingHistoryId={null}
        onViewChange={vi.fn()}
        onSelectHistory={vi.fn()}
      />,
    )
    expect(screen.getByText('a/b')).toBeDefined()
    expect(screen.getByText('3 risks')).toBeDefined()
  })

  it('shows loading state for history item being loaded', () => {
    const history: HistoryRecord[] = [
      { id: 1, repo_url: 'https://github.com/a/b', created_at: '2025-01-01', total_files: 5, total_directories: 2, language_count: 1, risk_count: 3, summary: 'ok' },
    ]
    render(
      <Sidebar
        history={history}
        activeView="rubric"
        loadingHistoryId={1}
        onViewChange={vi.fn()}
        onSelectHistory={vi.fn()}
      />,
    )
    expect(screen.getByText('Loading saved report...')).toBeDefined()
  })

  it('calls onViewChange when nav button clicked', () => {
    const onViewChange = vi.fn()
    render(
      <Sidebar
        history={[]}
        activeView="dashboard"
        loadingHistoryId={null}
        onViewChange={onViewChange}
        onSelectHistory={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('AI mentor'))
    expect(onViewChange).toHaveBeenCalledWith('mentor')
  })

  it('calls onSelectHistory when history item is clicked', () => {
    const onSelectHistory = vi.fn()
    const history: HistoryRecord[] = [
      { id: 1, repo_url: 'https://github.com/a/b', created_at: '2025-01-01', total_files: 5, total_directories: 2, language_count: 1, risk_count: 3, summary: 'ok' },
    ]
    render(
      <Sidebar
        history={history}
        activeView="dashboard"
        loadingHistoryId={null}
        onViewChange={vi.fn()}
        onSelectHistory={onSelectHistory}
      />,
    )
    fireEvent.click(screen.getByText('a/b'))
    expect(onSelectHistory).toHaveBeenCalledWith(history[0])
  })
})

describe('Shared components', () => {
  it('renders Metric component', () => {
    render(<Metric label="Score" value="72/100" icon={<span>icon</span>} />)
    expect(screen.getByText('Score')).toBeDefined()
    expect(screen.getByText('72/100')).toBeDefined()
  })

  it('renders ChecklistRow with passed item', () => {
    const item: ReadinessChecklistItem = { name: 'README', passed: true, points: 10, recommendation: 'Looks good' }
    render(<ChecklistRow item={item} />)
    expect(screen.getByText('README')).toBeDefined()
    expect(screen.getByText('Looks good')).toBeDefined()
    expect(screen.getByText('10')).toBeDefined()
  })

  it('renders ChecklistRow with failed item', () => {
    const item: ReadinessChecklistItem = { name: 'Tests', passed: false, points: 20, recommendation: 'Add tests' }
    render(<ChecklistRow item={item} />)
    expect(screen.getByText('Tests')).toBeDefined()
  })
})
