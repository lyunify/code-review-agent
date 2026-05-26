---
name: Enterprise-Grade Upgrade Design
description: Four-phase plan to transform the Code Review Agent from a local MVP into a deployed, production-quality web app suitable for an SDE intern portfolio
type: spec
date: 2026-05-25
---

# Enterprise-Grade Upgrade: Code Review Agent

## Problem Statement

The Code Review Agent has a solid MVP foundation — clean service architecture, Pydantic types, FastAPI + React separation, and 8 backend test files. However, several gaps prevent it from being considered production-quality:

- CI/CD lacks linting, type checking, and coverage thresholds
- App.tsx is 612 lines (no component separation)
- No backend logging/observability
- Analysis runs synchronously (will HTTP timeout on large repos)
- SQLite is ephemeral on Render (history lost on restart)
- No live deployment or public URL

The goal is to address all of these in four structured phases, each with a clear deliverable.

---

## Deployment Target

- **Frontend**: Vercel (React static build, auto-deploys from GitHub)
- **Backend**: Render Web Service (FastAPI, free tier)
- **Database**: Render PostgreSQL (free tier, replaces SQLite in production)
- **Domain**: Custom domain via Squarespace DNS → Vercel

---

## Phase 1: Code Quality Foundation

**Deliverable**: CI passes with linting, type checking, and coverage gates. App.tsx is split. Backend has structured logging.

### 1.1 CI/CD Additions

**Backend** (`.github/workflows/ci.yml`):
- Add `ruff` for linting and format checking (replaces flake8, faster, modern)
- Add `mypy` for static type checking
- Add `pytest --cov --cov-fail-under=80` for coverage threshold

**Frontend** (`.github/workflows/ci.yml`):
- Add `eslint` step
- Add `tsc --noEmit` for type checking without building
- Add coverage threshold to `vitest.config.ts` (`branches: 70, lines: 80`)

### 1.2 App.tsx Refactoring

Current state: 612 lines, all logic and layout in one file.

Extract the following:

| What | Into |
|------|------|
| Analysis state, API calls, history management | `hooks/useAnalysis.ts` |
| Left sidebar with history list | `components/HistorySidebar.tsx` |
| Report download button + logic | `components/ReportExport.tsx` |
| Tab navigation state | `components/ViewTabs.tsx` |

Target: App.tsx ≤ 150 lines, only layout and wiring.

### 1.3 Backend Structured Logging

Use Python standard `logging` module. Each service module gets its own named logger:

```python
logger = logging.getLogger(__name__)
```

Log at service entry/exit points with repo context:

```
INFO  [analyzer] Starting analysis: repo=owner/name files=1247
INFO  [readiness] Score computed: 72/100 status=almost-ready
ERROR [mentor_agent] OpenAI API failed, falling back to rule-based
INFO  [repo_loader] Cleanup complete: /tmp/tmpXXXXXX removed
```

Log format: `%(asctime)s %(levelname)s [%(name)s] %(message)s`

Configured in `app/main.py` with `logging.basicConfig`.

---

## Phase 2: Production Architecture

**Deliverable**: Analysis runs asynchronously with polling. Temp files are cleaned up automatically. Repos over 150MB are rejected. Database uses SQLAlchemy and supports both SQLite (local) and PostgreSQL (production).

### 2.1 Async Job System

**Problem**: `POST /analyze` currently blocks for 30-60 seconds. This will timeout in production.

**Solution**: Long-running job pattern.

New API contract:

```
POST /analyze          → { job_id: "abc123" }        (immediate)
GET  /jobs/{job_id}    → { status: "running", progress: "Cloning..." }
GET  /jobs/{job_id}    → { status: "done", result: {...} }
```

Implementation:
- In-memory dict `jobs: dict[str, JobState]` on the FastAPI app state
- `POST /analyze` spawns a Python `asyncio.create_task` and returns `job_id` immediately
- `GET /jobs/{job_id}` returns current status + result when complete
- Frontend polls every 2 seconds until `status == "done"`
- Jobs expire from memory after 1 hour

No Redis or Celery needed at this scale.

**Progress messages** (shown in frontend loading state):
1. `"Checking repository size..."`
2. `"Cloning repository..."`
3. `"Analyzing files..."`
4. `"Computing readiness score..."`
5. `"Generating mentor feedback..."`

### 2.2 Temp File Cleanup

Wrap all clone operations in `tempfile.TemporaryDirectory()` as a context manager:

```python
with tempfile.TemporaryDirectory() as tmpdir:
    clone_repo(url, tmpdir)
    result = analyze(tmpdir)
# tmpdir auto-deleted here, even on exception
```

Log cleanup event at INFO level.

### 2.3 Repo Size Limit

Before cloning, call GitHub API for repo metadata. If `size > 150_000` (KB), return error immediately:

```json
{ "error": "Repository too large (>150MB). Please try a smaller project." }
```

This prevents OOM and long clone times on the server.

### 2.4 Database: SQLAlchemy with SQLite/PostgreSQL

**Problem**: SQLite on Render free tier is ephemeral — history is lost on restart.

**Solution**: Use SQLAlchemy ORM. Connection is configured by `DATABASE_URL` environment variable.

| Environment | DATABASE_URL |
|-------------|--------------|
| Local dev | `sqlite:///./history.db` |
| Production | `postgresql://...` (Render injects this) |

No code changes needed when switching — only the env var changes.

Migration path: replace current raw `sqlite3` calls in `db/` with SQLAlchemy models. Schema stays the same (analysis history with JSON blob).

---

## Phase 3: Deployment

**Deliverable**: Live URL accessible from a custom domain. Frontend and backend auto-deploy on push to `main`.

### 3.1 Frontend: Vercel

- Connect GitHub repo to Vercel
- Build command: `npm run build` (in `frontend/web/`)
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://api.yourdomain.com`
- Free tier, unlimited bandwidth

### 3.2 Backend: Render Web Service

- Connect GitHub repo to Render
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Root directory: `backend/`
- Environment variables:
  - `OPENAI_API_KEY`
  - `DATABASE_URL` (auto-injected by Render PostgreSQL add-on)
  - `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
- Free tier: sleeps after 15 min inactivity (cold start ~30s). Acceptable for portfolio.

### 3.3 Custom Domain (Squarespace → Vercel)

Add two DNS records in Squarespace:

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `www` | `cname.vercel-dns.com` |
| `A` | `@` | Vercel IP |

Backend on subdomain: `api.yourdomain.com` → Render's custom domain setting.

### 3.4 Production CORS

`CORS_ORIGINS` env var replaces hardcoded `localhost:5173`. Backend reads it as a comma-separated list:

```python
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
```

---

## Phase 4: Visual Polish

**Deliverable**: README has live demo link, real screenshots, and a GIF. UI handles all states gracefully. Mobile doesn't break.

### 4.1 README Upgrade

- Live demo URL at the very top (before any other content)
- Hero screenshot of Dashboard with a real analysis result
- Animated GIF showing: URL input → loading with progress → results rendered
- Simplified quick-start (3 commands max)
- Architecture diagram (Mermaid, rendered natively on GitHub)

### 4.2 Loading State with Progress

Frontend shows meaningful progress during async polling:

```
[●●●○○]  Analyzing files...  (step 3 of 5)
```

Not just a spinner — actual progress messages from the job status response.

### 4.3 Error States

Each failure mode gets a specific, actionable message:

| Error | Message shown |
|-------|---------------|
| Repo > 150MB | "This repository is too large to analyze. Try a smaller project." |
| Private repo | "This repository is private. Only public repositories are supported." |
| Invalid URL | "Please enter a valid GitHub repository URL." |
| Server error | "Something went wrong on our end. Please try again in a moment." |

### 4.4 Empty State

First-time visitors see a guided empty state instead of a blank screen:

> "Paste any public GitHub URL to check if it's resume-ready."
> 
> **Try an example →** `https://github.com/gothinkster/realworld`

### 4.5 Mobile

Basic responsive layout — the app should be readable on a phone even if not perfectly optimized. Minimum: no horizontal scroll, readable font sizes.

### 4.6 Supporting Docs

- `docs/architecture.md`: add Mermaid diagram of the full system
- `CONTRIBUTING.md`: one-page guide (local setup, running tests, PR process)
- FastAPI `/docs` endpoint: mention in README as "API documentation"

---

## Architecture Decision Record: Why Clone Instead of GitHub API Only

The backend clones repositories to disk rather than using the GitHub API exclusively. This was a deliberate choice:

**Reasons to clone:**
- Read any file without API rate limits
- Detect patterns across the full file tree (test coverage, structure, file sizes)
- No dependency on GitHub API token for basic analysis

**Trade-offs accepted:**
- Requires disk I/O management (handled by Phase 2 temp file cleanup)
- Size limits needed to prevent OOM (handled by 150MB check)
- Async pattern needed for large repos (handled by Phase 2 job system)

**Why this is the right call for a portfolio project:**
- Demonstrates understanding of resource management, async patterns, and operational constraints
- Provides richer analysis than API-only approach
- Gives concrete engineering decisions to discuss in interviews

---

## Implementation Order

Each phase must be fully committed and CI-green before starting the next.

| Phase | Key output | Success criteria |
|-------|-----------|-----------------|
| 1 | Code quality | CI green with lint + typecheck + coverage |
| 2 | Production arch | Async analysis working, DB migrated |
| 3 | Deployment | Live URL accessible, custom domain working |
| 4 | Polish | README has real screenshots, all error states handled |
