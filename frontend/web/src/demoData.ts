import type { AnalyzeResponse } from './types'

export function getDemoAnalysisResult(): AnalyzeResponse {
  return {
    repo_url: 'https://github.com/lyunify/repo-ready',
    analysis: {
      total_files: 48,
      total_directories: 16,
      languages: {
        Python: 24,
        TypeScript: 13,
        CSS: 3,
        Markdown: 4,
        TOML: 1,
        JSON: 3,
      },
      largest_files: [
        { path: 'frontend/web/src/App.tsx', size_bytes: 24800, lines: 612, language: 'TypeScript' },
        { path: 'backend/app/services/action_plan.py', size_bytes: 9400, lines: 170, language: 'Python' },
        { path: 'backend/app/services/analyzer.py', size_bytes: 7300, lines: 142, language: 'Python' },
      ],
      risks: [
        {
          severity: 'medium',
          message: 'Long file detected (612 lines). Consider splitting UI sections into smaller components.',
          path: 'frontend/web/src/App.tsx',
        },
        {
          severity: 'low',
          message: 'Screenshots are currently placeholders in the README.',
          path: 'README.md',
        },
      ],
    },
    github_metadata: {
      available: true,
      full_name: 'lyunify/repo-ready',
      description: 'AI-assisted repository readiness platform for SDE internship project review.',
      topics: ['fastapi', 'react', 'typescript', 'openai', 'sqlite'],
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
      score: 91,
      status: 'Resume-ready',
      priority_fixes: [
        'Split long frontend files into smaller components with clearer responsibilities.',
        'Replace README screenshot placeholders with polished dashboard images.',
        'Add a short deployment note once the app is hosted.',
      ],
      checklist: [
        {
          name: 'README exists',
          passed: true,
          points: 10,
          recommendation: 'Keep the README focused on product value and setup.',
        },
        {
          name: 'README explains project purpose',
          passed: true,
          points: 8,
          recommendation: 'The README explains the target user and resume-readiness use case.',
        },
        {
          name: 'README includes setup instructions',
          passed: true,
          points: 10,
          recommendation: 'Local backend and frontend setup commands are documented.',
        },
        {
          name: 'README includes usage or demo details',
          passed: true,
          points: 8,
          recommendation: 'Add screenshots after the final UI polish pass.',
        },
        {
          name: 'README lists tech stack',
          passed: true,
          points: 7,
          recommendation: 'The main technologies are listed clearly.',
        },
        {
          name: 'README includes screenshots or demo assets',
          passed: false,
          points: 7,
          recommendation: 'Replace screenshot placeholders with final dashboard captures.',
        },
        {
          name: 'Automated tests exist',
          passed: true,
          points: 15,
          recommendation: 'Backend and frontend tests cover core behavior.',
        },
        {
          name: 'Dependency file exists',
          passed: true,
          points: 5,
          recommendation: 'Python and JavaScript dependency files are present.',
        },
        {
          name: '.gitignore exists',
          passed: true,
          points: 6,
          recommendation: 'Generated files and local secrets are ignored.',
        },
        {
          name: '.env.example exists',
          passed: true,
          points: 5,
          recommendation: 'Environment variables are documented safely.',
        },
        {
          name: 'Architecture docs exist',
          passed: true,
          points: 4,
          recommendation: 'Architecture docs explain the system boundaries.',
        },
        {
          name: 'No long files detected',
          passed: false,
          points: 5,
          recommendation: 'Split long files into smaller modules with clearer responsibilities.',
        },
        {
          name: 'Risk density is low',
          passed: true,
          points: 5,
          recommendation: 'Risk density is low for the project size.',
        },
        {
          name: 'Project has multiple organized directories',
          passed: true,
          points: 3,
          recommendation: 'The project uses backend, frontend, tests, and docs directories.',
        },
        {
          name: 'Frontend/backend boundaries are clear',
          passed: true,
          points: 2,
          recommendation: 'React and FastAPI responsibilities are separated.',
        },
      ],
    },
    report: {
      summary:
        'Code Review Agent is a full-stack project readiness platform with a React frontend, FastAPI backend, SQLite history, AI mentor feedback, and automated tests across backend and frontend behavior.',
      recommendations: [
        'Split large frontend sections into smaller React components.',
        'Add final screenshots to the README after visual polish.',
        'Document deployment once the app is hosted.',
      ],
    },
    mentor_feedback: {
      mentor_summary:
        'This project is strong enough to discuss in an SDE intern interview because it combines backend API design, static analysis, persistence, AI-assisted feedback, and a typed React dashboard around a clear student pain point.',
      resume_bullets: [
        'Built a full-stack project readiness platform using FastAPI, React, TypeScript, and SQLite to analyze GitHub repositories for SDE internship resume quality.',
        'Implemented deterministic repository analysis and checklist-based scoring across README quality, tests, dependencies, architecture, and risk signals.',
        'Integrated AI-assisted mentor feedback to generate prioritized action plans, resume bullets, and interview preparation prompts.',
      ],
      interview_questions: [
        {
          question: 'How does the readiness score balance deterministic rules with AI-generated feedback?',
          situation: 'I built Repo Ready to help students decide whether a GitHub project belongs on a resume.',
          task: 'I needed feedback that was both explainable and useful for interview preparation.',
          action: 'I kept the readiness score deterministic and used AI only for mentor-style interpretation.',
          result: 'The app can give repeatable scores while still producing tailored resume and interview guidance.',
        },
        {
          question: 'How would you scale repository analysis for larger projects or multiple concurrent users?',
          situation: 'Repository analysis can involve cloning, scanning, and external API calls.',
          task: 'I needed to keep long-running work out of the request path.',
          action: 'I separated job status from execution and added a Redis/RQ worker path.',
          result: 'The backend can enqueue work and let the frontend poll without blocking the API request.',
        },
        {
          question: 'What tradeoffs did you make between local analysis, saved history, and real-time AI responses?',
          situation: 'The product needs reliable demos even when external AI services are unavailable.',
          task: 'I needed the core experience to keep working without an API key.',
          action: 'I made static analysis and scoring deterministic, persisted reports, and added rule-based AI fallback.',
          result: 'The app stays usable for local demos while still supporting richer AI feedback in production.',
        },
      ],
      next_steps: [
        'Refactor the largest frontend file into smaller components.',
        'Add polished screenshots to the README.',
        'Deploy the frontend and backend for public demos.',
      ],
    },
    action_plan: {
      items: [
        {
          title: 'Refactor large frontend sections',
          category: 'Maintainability',
          why_it_matters:
            'Smaller components make the code easier to review, test, and discuss during a technical interview.',
          how_to_improve:
            'Extract dashboard, sidebar, action plan, and empty state sections from App.tsx into focused component files.',
          resume_impact: 'Shows that the project is organized like a maintainable full-stack application.',
        },
        {
          title: 'Replace screenshot placeholders',
          category: 'Presentation',
          why_it_matters:
            'Recruiters and interviewers often inspect a GitHub README before running the project locally.',
          how_to_improve:
            'Capture the dashboard, Action plan, and AI mentor views after the UI polish pass and link them in README.md.',
          resume_impact: 'Makes the project feel portfolio-ready at first glance.',
        },
        {
          title: 'Add deployment notes',
          category: 'Product',
          why_it_matters:
            'A hosted demo lowers friction for interviewers and makes the project easier to share.',
          how_to_improve:
            'Document the intended deployment approach for the React frontend, FastAPI backend, and required environment variables.',
          resume_impact: 'Demonstrates product thinking beyond local development.',
        },
      ],
    },
  }
}
