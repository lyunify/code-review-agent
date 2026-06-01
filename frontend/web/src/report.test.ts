import { describe, expect, it } from 'vitest'
import { generateMarkdownReport, getReportFileName } from './report'
import type { AnalyzeResponse } from './types'

const result: AnalyzeResponse = {
  repo_url: 'https://github.com/lyunify/repo-ready',
  analysis: {
    total_files: 10,
    total_directories: 4,
    languages: { Python: 7, Markdown: 3 },
    largest_files: [],
    risks: [{ severity: 'medium', message: 'Long file detected (350 lines).', path: 'app.py' }],
  },
  github_metadata: {
    available: true,
    full_name: 'lyunify/repo-ready',
    description: 'Repository readiness tool',
    topics: ['fastapi', 'react'],
    license_name: 'MIT License',
    license_spdx_id: 'MIT',
    stars: 0,
    forks: 0,
    open_issues: 0,
    default_branch: 'main',
    homepage: null,
    has_homepage: false,
    is_archived: false,
    is_fork: false,
    created_at: '2026-05-25T00:00:00Z',
    updated_at: '2026-05-25T00:00:00Z',
    pushed_at: '2026-05-25T00:00:00Z',
  },
  readiness: {
    score: 82,
    status: 'Almost ready',
    priority_fixes: ['Add screenshots or a short demo GIF.'],
    checklist: [
      {
        name: 'README exists',
        passed: true,
        points: 10,
        recommendation: 'Write a README that explains what the project does.',
      },
      {
        name: 'Automated tests exist',
        passed: false,
        points: 15,
        recommendation: 'Add automated tests for the core project workflow.',
      },
    ],
  },
  report: {
    summary: 'Scanned 10 files across 4 directories.',
    recommendations: ['Add tests.'],
  },
  mentor_feedback: {
    mentor_summary: 'This project is close to resume-ready.',
    resume_bullets: ['Built a full-stack repo reviewer.'],
    interview_questions: [
      {
        question: 'How would you scale this?',
        situation: 'I built a repository review app.',
        task: 'I needed to support longer scans.',
        action: 'I moved work into background jobs.',
        result: 'The API can return quickly while work continues.',
      },
    ],
    next_steps: ['Add tests.'],
  },
  action_plan: {
    items: [
      {
        title: 'Add automated tests',
        category: 'Testing',
        why_it_matters: 'Interviewers trust projects more when behavior is tested.',
        how_to_improve: 'Add tests for the core workflow.',
        resume_impact: 'Shows engineering discipline.',
      },
    ],
  },
}

describe('generateMarkdownReport', () => {
  it('includes score, checklist, mentor feedback, and risks', () => {
    const report = generateMarkdownReport(result)

    expect(report).toContain('# Repository Readiness Report')
    expect(report).toContain('**Score:** 82/100')
    expect(report).toContain('This project is close to resume-ready.')
    expect(report).toContain('How would you scale this?')
    expect(report).not.toContain('[object Object]')
    expect(report).toContain('## Action Plan')
    expect(report).toContain('Add automated tests')
    expect(report).toContain('## GitHub Profile Signals')
    expect(report).toContain('- License: MIT')
    expect(report).toContain('- [x] README exists')
    expect(report).toContain('- [ ] Automated tests exist')
    expect(report).toContain('Long file detected')
  })
})

describe('getReportFileName', () => {
  it('creates a safe markdown file name from the repository URL', () => {
    expect(getReportFileName(result)).toBe('lyunify-repo-ready-readiness-report.md')
  })
})
