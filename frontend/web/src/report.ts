import type { AnalyzeResponse } from './types'

export function generateMarkdownReport(result: AnalyzeResponse): string {
  const checklist = result.readiness.checklist
    .map((item) => `- [${item.passed ? 'x' : ' '}] ${item.name} (${item.points} pts): ${item.recommendation}`)
    .join('\n')

  const priorityFixes = result.readiness.priority_fixes.map((fix, index) => `${index + 1}. ${fix}`).join('\n')
  const actionPlan = result.action_plan.items
    .map(
      (item, index) =>
        `${index + 1}. **${item.title}** (${item.category})\n` +
        `   - Why it matters: ${item.why_it_matters}\n` +
        `   - How to improve: ${item.how_to_improve}\n` +
        `   - Resume impact: ${item.resume_impact}`,
    )
    .join('\n')
  const resumeBullets = result.mentor_feedback.resume_bullets.map((bullet) => `- ${bullet}`).join('\n')
  const interviewQuestions = result.mentor_feedback.interview_questions.map((question, index) => `${index + 1}. ${question.question}`).join('\n')
  const risks = result.analysis.risks.length
    ? result.analysis.risks.map((risk) => `- ${risk.severity}: ${risk.message}${risk.path ? ` (${risk.path})` : ''}`).join('\n')
    : '- No risk signals found.'
  const topics = result.github_metadata.topics.length ? result.github_metadata.topics.join(', ') : 'None'
  const intelligence = result.analysis.project_intelligence
  const toyRisk = intelligence?.toy_project_risk
  const toyRiskReport = toyRisk
    ? `**${toyRisk.label}** (${toyRisk.score}/100, ${toyRisk.confidence} confidence)\n\n${toyRisk.summary}\n\n${toyRisk.reasons
        .map((reason) => `- ${reason.sentiment === 'negative' ? 'Watch' : 'Proof'}: ${reason.title} - ${reason.evidence}`)
        .join('\n')}`
    : 'No toy-project risk inference available.'
  const stackMap = intelligence?.stack.length
    ? intelligence.stack
        .map((item) => {
          const evidence = item.evidence[0]
          return `- **${item.name}** (${item.category}, ${item.confidence}): ${item.description}${evidence ? ` Evidence: ${evidence.path}` : ''}`
        })
        .join('\n')
    : '- No stack evidence found.'
  const architecture = intelligence?.architecture.edges.length
    ? `${intelligence.architecture.summary}\n\n${intelligence.architecture.edges
        .map((edge) => {
          const evidence = edge.evidence[0]
          return `- ${edge.source} -> ${edge.target}: ${edge.label}${evidence ? ` (${evidence.path})` : ''}`
        })
        .join('\n')}\n\n\`\`\`mermaid\n${intelligence.architecture.mermaid}\n\`\`\``
    : intelligence?.architecture.summary ?? 'No architecture inference available.'

  return `# Repository Readiness Report

**Repository:** ${result.repo_url}
**Score:** ${result.readiness.score}/100
**Status:** ${result.readiness.status}

## Mentor Summary

${result.mentor_feedback.mentor_summary}

## Top Fixes

${priorityFixes}

## Action Plan

${actionPlan}

## Resume Bullet Suggestions

${resumeBullets}

## Interview Prep Questions

${interviewQuestions}

## Readiness Checklist

${checklist}

## Technical Summary

${result.report.summary}

## Toy Project Risk

${toyRiskReport}

## Stack Map

${stackMap}

## Architecture Flow

${architecture}

## GitHub Profile Signals

- Description: ${result.github_metadata.description ? 'Present' : 'Missing'}
- License: ${result.github_metadata.license_spdx_id ?? 'Missing'}
- Topics: ${topics}
- Homepage: ${result.github_metadata.has_homepage ? 'Present' : 'Missing'}
- Fork: ${result.github_metadata.is_fork ? 'Yes' : 'No'}
- Default branch: ${result.github_metadata.default_branch ?? 'Unknown'}

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
