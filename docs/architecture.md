# Architecture

`code-review-agent` is split into a Python backend, a polished React frontend, a background worker, and a legacy Streamlit quick demo.

## Backend

The FastAPI backend accepts analysis requests, persists job state, and returns a `job_id` immediately. In simple local mode it can still run work in a background thread; in production-style mode it enqueues analysis jobs through Redis/RQ so long-running repository scans are handled outside the request path.

The worker clones public repositories, runs static analysis, enriches results with GitHub API metadata, calculates resume readiness, saves a compact history record, and updates job status. The API layer stays thin; core behavior lives in services so it can be tested without HTTP.

Postgres is the production-style database target, while SQLite remains convenient for local tests and lightweight demos. Alembic owns schema migrations for the `analysis_history` and `analysis_jobs` tables.

## Frontend

The React frontend is the primary portfolio demo. It calls the backend API, then renders resume readiness, AI mentor feedback, checklist results, technical scan details, and history. The Streamlit frontend remains available as a lightweight local fallback.

## Production Backend Runtime

```text
React + TypeScript
        |
        v
FastAPI API
        |
        |-- Postgres: job state and analysis history
        |-- Redis/RQ: analysis queue
        |
        v
Worker process
        |
        |-- repository clone + static analysis
        |-- GitHub REST API metadata
        |-- OpenAI mentor feedback with fallback logic
```

Docker Compose provides `api`, `worker`, `postgres`, and `redis` services. The API exposes `/health/live` for process liveness and `/health/ready` for dependency readiness.

## Service Boundaries

- `repo_loader`: gets source code onto disk.
- `analyzer`: inspects files and computes metrics.
- `github_metadata`: fetches public repository metadata such as description, topics, license, homepage, and fork status.
- `readiness`: calculates a resume readiness score, checklist, and priority fixes using documentation, testing, dependency, structure, and risk-density signals.
- `mentor_agent`: generates OpenAI-backed mentor feedback when an API key is configured, with a rule-based fallback for local demos and tests.
- `report_generator`: turns metrics into user-facing interpretation.
- `db`: stores analysis history and persistent job state.
- `jobs`: coordinates job creation, status updates, thread-mode execution, and Redis queue handoff.
- `worker`: starts an RQ worker that processes queued analysis jobs.
- `routes`: handles HTTP request and response flow.

## Interview Talking Points

- The API does not block on repository scans; it returns a job id and lets the frontend poll status.
- Job state is persisted, which is a stronger backend signal than keeping all status only in process memory.
- Redis/RQ separates request handling from long-running work and creates a path to horizontal worker scaling.
- Alembic migrations make schema evolution explicit.
- Liveness and readiness endpoints show deployment awareness: the process can be alive even when a dependency is unavailable.
