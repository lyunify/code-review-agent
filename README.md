# Code Review Agent

[![CI](https://github.com/lyunify/code-review-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/lyunify/code-review-agent/actions/workflows/ci.yml)

An AI-assisted repository readiness platform that helps CS students evaluate whether a GitHub project is strong enough to include on an SDE internship resume. It analyzes public repositories, scores project readiness, generates prioritized improvement plans, and turns technical signals into resume and interview preparation guidance.

## Problem

Students often know how to build class projects, but it is harder to judge whether a GitHub repository is polished enough for a resume or technical interview. Code Review Agent turns repository structure, documentation quality, test coverage signals, and project hygiene into actionable feedback for SDE internship preparation.

## Tech Stack

- Backend: FastAPI
- Frontend: React, TypeScript, Vite
- Data storage: SQLite
- AI feedback: OpenAI API with rule-based fallback
- Repository metadata: GitHub REST API
- Legacy prototype: Streamlit
- Core logic: Python services
- Tests and CI: pytest, Vitest, GitHub Actions

## Architecture

The project is organized as a full-stack web application with a service-oriented backend:

```text
React + TypeScript frontend
        |
        | HTTP JSON API
        v
FastAPI backend
        |
        |-- repo_loader: clones public GitHub repositories
        |-- analyzer: scans files, languages, README quality, tests, and risk signals
        |-- readiness: calculates checklist-based resume readiness scores
        |-- action_plan: generates prioritized improvement tasks
        |-- mentor_agent: creates AI mentor feedback with fallback logic
        |-- db: saves and restores analysis history with SQLite
```

More details are available in [`docs/architecture.md`](docs/architecture.md).

## Product Capabilities

- Analyze public GitHub repositories from a URL.
- Score resume readiness with a checklist-based rubric.
- Inspect repository structure, languages, file counts, largest files, and risk signals.
- Evaluate README quality, setup instructions, usage notes, tech stack documentation, and demo assets.
- Detect project hygiene signals such as tests, dependency files, docs, `.gitignore`, and `.env.example`.
- Detect production-readiness signals such as CI workflows, license files, deployment config, API docs, and frontend/backend integration.
- Enrich analysis with GitHub metadata such as repository description, topics, license, homepage, and fork status.
- Generate prioritized action plans that explain what to fix, why it matters, and how it improves resume value.
- Produce AI mentor feedback with resume bullets, interview questions, and next steps.
- Save analysis history in SQLite and reopen saved reports from the dashboard.
- Export a Markdown readiness report for portfolio review or interview preparation.

## How It Works

1. A user enters a public GitHub repository URL.
2. The backend clones the repository into a temporary local workspace.
3. Static analysis inspects files, directories, languages, README quality, tests, dependency manifests, docs, and risk signals.
4. GitHub metadata lookup enriches the report with public profile signals such as description, license, topics, homepage, and fork status.
5. The readiness service calculates a resume-readiness score from deterministic checklist rules.
6. The action plan service converts missing signals into prioritized improvement tasks.
7. The mentor agent generates resume bullets, interview questions, and next steps using OpenAI when configured, with a local fallback for reliable demos.
8. The result is saved to SQLite so previous reports can be reopened from the dashboard.

## Screenshots

Screenshots will be added after the frontend polish pass. The placeholders below mark the planned README layout.

### Screenshot 1: Repository Review Dashboard

_Placeholder: main dashboard with readiness score, repository metrics, mentor brief, and checklist inspector._

### Screenshot 2: Prioritized Action Plan

_Placeholder: action plan view showing what to fix next, why it matters, and how it improves resume value._

### Screenshot 3: AI Mentor Feedback

_Placeholder: AI mentor view with resume bullets and interview preparation questions._

## Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add your OpenAI API key to `backend/.env`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
```

Install the React frontend:

```bash
cd ../frontend/web
npm install
```

## Run Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

Run frontend tests:

```bash
cd frontend/web
npm test
```

Build the React frontend:

```bash
cd frontend/web
npm run build
```

## Run Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Run React Frontend

In a second terminal:

```bash
cd frontend/web
npm run dev
```

Open `http://127.0.0.1:5173`.

## Run Streamlit Frontend

In a second terminal:

```bash
cd frontend
../backend/.venv/bin/streamlit run streamlit_app.py
```

## API Endpoints

- `GET /health`: backend health check.
- `POST /api/analyze`: clone and analyze a public repository.
- `GET /api/history`: return recent saved analysis records.
- `GET /api/history/{record_id}`: reopen a saved analysis report.

## Engineering Notes

- The backend keeps HTTP route handlers thin and places business logic in testable service modules.
- The readiness score is deterministic so results are explainable and repeatable.
- GitHub metadata is treated as enrichment data; lookup failures fall back gracefully instead of failing the full analysis.
- AI feedback is treated as an enhancement, not a hard dependency; local fallback logic keeps the app usable without an API key.
- The React frontend is split into typed components for dashboard, rubric, action plan, mentor feedback, loading state, and sidebar navigation.
- Demo mode provides a stable offline result for presentations and future screenshots.
- GitHub Actions runs backend tests, frontend tests, and the frontend production build on push and pull requests.

## Future Improvements

- Replace screenshot placeholders with polished dashboard, action plan, and mentor view screenshots.
- Deploy the React frontend and FastAPI backend for public demos.
- Expand GitHub API support with commit activity, pull request history, and repository health signals.
- Add per-user saved reports and authentication.
- Support private repositories through secure GitHub OAuth.

## License

This project is licensed under the [MIT License](LICENSE).
