import { describe, expect, it } from 'vitest'
import { generateMarkdownReport, getReportFileName } from './report'
import type { AnalyzeResponse } from './types'

const result: AnalyzeResponse = {
  repo_url: 'https://github.com/lyunify/code-review-agent',
  analysis: {
    total_files: 10,
    total_directories: 4,
    languages: { Python: 7, Markdown: 3 },
    largest_files: [],
    risks: [{ severity: 'medium', message: 'Long file detected (350 lines).', path: 'app.py' }],
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
    interview_questions: ['How would you scale this?'],
    next_steps: ['Add tests.'],
  },
}

describe('generateMarkdownReport', () => {
  it('includes score, checklist, mentor feedback, and risks', () => {
    const report = generateMarkdownReport(result)

    expect(report).toContain('# Repository Readiness Report')
    expect(report).toContain('**Score:** 82/100')
    expect(report).toContain('This project is close to resume-ready.')
    expect(report).toContain('- [x] README exists')
    expect(report).toContain('- [ ] Automated tests exist')
    expect(report).toContain('Long file detected')
  })
})

describe('getReportFileName', () => {
  it('creates a safe markdown file name from the repository URL', () => {
    expect(getReportFileName(result)).toBe('lyunify-code-review-agent-readiness-report.md')
  })
})
