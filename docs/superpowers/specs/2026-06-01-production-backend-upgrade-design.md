# Production Backend Upgrade Design

## Goal

Upgrade Repo Ready's backend from a polished full-stack demo into a more production-shaped service that shows stronger SDE intern backend signals: containerized local infrastructure, Postgres schema management, Redis-backed background jobs, and dependency-aware health checks.

## Scope

This phase focuses on backend infrastructure and deployability. It does not add user accounts, GitHub OAuth, private repository access, payments, or multi-tenant authorization. Those are better suited for a later authentication phase after the core service runtime is production-shaped.

## Architecture

The React frontend continues to call the FastAPI API over HTTP. `POST /api/analyze` will create a persisted analysis job and enqueue work in Redis. A worker process will pull jobs from Redis, clone and analyze the target repository, call GitHub/OpenAI integrations when available, persist the final report in Postgres, and update job status for frontend polling.

```text
React + TypeScript
        |
        v
FastAPI API
        |
        |-- Postgres: analysis history, job status
        |-- Redis: background job queue
        |
        v
Worker process
        |
        |-- GitHub REST API
        |-- OpenAI API with rule-based fallback
        |-- repository clone + static analysis
```

## Components

- Docker Compose will provide a repeatable local stack with `api`, `worker`, `postgres`, and `redis` services.
- Alembic will manage database schema migrations instead of relying only on SQLAlchemy `create_all`.
- A job store abstraction will persist job lifecycle state in the database so status survives API process restarts.
- A Redis-backed queue will replace in-process `threading.Thread` execution for analysis jobs.
- Health endpoints will be split into liveness and readiness checks:
  - `GET /health/live` confirms the API process is running.
  - `GET /health/ready` confirms required dependencies such as the database and Redis are reachable.
- README documentation will show the new architecture, Docker workflow, and interview talking points.

## Data Model

Keep the existing `analysis_history` table for saved reports. Add an `analysis_jobs` table with:

- `id`: job id string.
- `repo_url`: requested repository URL.
- `status`: `pending`, `running`, `done`, or `failed`.
- `progress`: short user-facing progress message.
- `result_history_id`: nullable link to the saved analysis history row when complete.
- `error`: nullable failure message.
- `created_at` and `updated_at`: UTC timestamps.

The API response shape can remain compatible with the current frontend: `POST /api/analyze` returns `job_id`, and `GET /api/jobs/{job_id}` returns status, progress, result, and error.

## Error Handling

Repository size errors, clone failures, GitHub lookup failures, OpenAI failures, and unexpected worker exceptions should all update job state instead of leaving a polling request stuck. OpenAI remains optional: if the API key is missing or unavailable, the mentor feedback service keeps using the existing rule-based fallback.

Readiness checks should fail fast with a structured response when Postgres or Redis is unavailable, while liveness stays independent of external dependencies.

## Testing

Use test-driven development for behavior changes:

- Unit-test job persistence transitions with SQLite-backed test databases.
- Unit-test readiness checks with fake dependency probes.
- API-test job creation and job status retrieval without requiring a live Redis server.
- Keep existing backend tests passing.
- Keep frontend tests passing because the external API contract should remain compatible.

Docker Compose itself will be verified with configuration inspection and, when local services can start, a smoke test against `/health/ready`.

## Rollout Plan

1. Add Alembic and database migration structure while preserving existing local SQLite compatibility for tests.
2. Add persistent job records and route tests while keeping the existing in-process execution as a temporary adapter.
3. Add Redis queue and worker execution.
4. Add Docker Compose services and environment examples.
5. Add liveness/readiness endpoints.
6. Update README and architecture docs with the production backend story.
