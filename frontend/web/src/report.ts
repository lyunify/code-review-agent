import type { AnalyzeResponse } from './types'

export function generateMarkdownReport(result: AnalyzeResponse): string {
  const checklist = result.readiness.checklist
    .map((item) => `- [${item.passed ? 'x' : ' '}] ${item.name} (${item.points} pts): ${item.recommendation}`)
    .join('\n')

  const priorityFixes = result.readiness.priority_fixes.map((fix, index) => `${index + 1}. ${fix}`).join('\n')
  const resumeBullets = result.mentor_feedback.resume_bullets.map((bullet) => `- ${bullet}`).join('\n')
  const interviewQuestions = result.mentor_feedback.interview_questions.map((question, index) => `${index + 1}. ${question}`).join('\n')
  const risks = result.analysis.risks.length
    ? result.analysis.risks.map((risk) => `- ${risk.severity}: ${risk.message}${risk.path ? ` (${risk.path})` : ''}`).join('\n')
    : '- No risk signals found.'

  return `# Repository Readiness Report

**Repository:** ${result.repo_url}
**Score:** ${result.readiness.score}/100
**Status:** ${result.readiness.status}

## Mentor Summary

${result.mentor_feedback.mentor_summary}

## Top Fixes

${priorityFixes}

## Resume Bullet Suggestions

${resumeBullets}

## Interview Prep Questions

${interviewQuestions}

## Readiness Checklist

${checklist}

## Technical Summary

${result.report.summary}

## Risk Signals

${risks}
`
}

export function getReportFileName(result: AnalyzeResponse): string {
  const repoName = result.repo_url
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${repoName || 'repository'}-readiness-report.md`
}
