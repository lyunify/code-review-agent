# Production Backend Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production backend signals to Repo Ready with persistent jobs, dependency-aware health checks, Alembic migrations, Redis worker plumbing, Docker Compose, and updated documentation.

**Architecture:** Preserve the existing API contract while moving job state into a database-backed store and preparing execution for a Redis worker. Keep implementation incremental so each commit leaves the app testable.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL-compatible database URLs, Redis/RQ, Docker Compose, pytest, Vitest.

---

## File Structure

- Modify `backend/requirements.txt` to add Alembic, Redis, and RQ dependencies.
- Modify `backend/app/db/models.py` to add the `AnalysisJobRow` table.
- Modify `backend/app/db/database.py` to add job persistence methods and lightweight dependency probes.
- Modify `backend/app/jobs.py` to use the persistent job store while preserving the current analysis function.
- Modify `backend/app/api/routes.py` to create and fetch persistent jobs.
- Modify `backend/app/main.py` to add `/health/live` and `/health/ready`.
- Create `backend/alembic.ini`, `backend/alembic/env.py`, and `backend/alembic/versions/0001_initial_schema.py`.
- Create `backend/app/worker.py` for Redis/RQ worker entrypoints.
- Create `docker-compose.yml` and update `backend/.env.example`.
- Update `README.md` and `docs/architecture.md`.

## Tasks

### Task 1: Persistent Job Store

**Files:**
- Modify: `backend/app/db/models.py`
- Modify: `backend/app/db/database.py`
- Modify: `backend/app/jobs.py`
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_database.py`
- Test: `backend/tests/test_api.py`

- [ ] Write failing tests for creating a job row, marking it running, marking it done with a saved history id, marking it failed, and retrieving it by id.
- [ ] Run `cd backend && pytest tests/test_database.py::test_job_store_persists_status_transitions -v` and verify it fails because job persistence does not exist.
- [ ] Add `AnalysisJobRow` and `AnalysisHistoryStore` methods: `create_job`, `get_job`, `mark_job_running`, `mark_job_done`, and `mark_job_failed`.
- [ ] Update API/job orchestration to create persistent job rows while keeping the existing thread execution path temporarily.
- [ ] Run `cd backend && pytest tests/test_database.py tests/test_api.py -v` and verify all selected tests pass.
- [ ] Commit with `feat: persist analysis job state`.

### Task 2: Health and Readiness Checks

**Files:**
- Modify: `backend/app/db/database.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api.py`

- [ ] Write failing API tests for `GET /health/live` returning `{"status": "ok"}` and `GET /health/ready` returning database readiness details.
- [ ] Run `cd backend && pytest tests/test_api.py::test_health_readiness_checks_dependencies -v` and verify it fails because the endpoints do not exist.
- [ ] Add dependency probe methods that execute a simple SQL statement and return structured status.
- [ ] Add `/health/live` and `/health/ready` endpoints while preserving the existing `/health` endpoint for deployment compatibility.
- [ ] Run `cd backend && pytest tests/test_api.py -v` and verify all API tests pass.
- [ ] Commit with `feat: add backend readiness checks`.

### Task 3: Alembic Migrations

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial_schema.py`
- Test: `backend/tests/test_database.py`

- [ ] Write a failing migration smoke test that runs Alembic upgrade against a temporary SQLite database and verifies `analysis_history` and `analysis_jobs` exist.
- [ ] Run `cd backend && pytest tests/test_database.py::test_alembic_initial_schema_creates_tables -v` and verify it fails because Alembic is not configured.
- [ ] Add Alembic configuration and an initial migration matching the SQLAlchemy models.
- [ ] Run `cd backend && pytest tests/test_database.py::test_alembic_initial_schema_creates_tables -v` and verify it passes.
- [ ] Run `cd backend && pytest tests/test_database.py -v`.
- [ ] Commit with `feat: add database migrations`.

### Task 4: Redis Worker Plumbing

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/jobs.py`
- Create: `backend/app/worker.py`
- Test: `backend/tests/test_api.py`
- Test: `backend/tests/test_config.py`

- [ ] Write failing tests showing `POST /api/analyze` can enqueue through an injected queue adapter and that local test mode can still run without Redis.
- [ ] Run the targeted tests and verify they fail because no queue abstraction exists.
- [ ] Add `REDIS_URL`, queue adapter functions, and a worker entrypoint that calls the existing analysis runner.
- [ ] Keep tests independent from a live Redis server by using a fake queue adapter.
- [ ] Run `cd backend && pytest tests/test_api.py tests/test_config.py -v`.
- [ ] Commit with `feat: add redis worker entrypoint`.

### Task 5: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Modify: `backend/.env.example`
- Modify: `README.md`

- [ ] Add Compose services for `api`, `worker`, `postgres`, and `redis`.
- [ ] Add environment examples for `DATABASE_URL`, `REDIS_URL`, `ALLOWED_ORIGINS`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.
- [ ] Run `docker compose config` and verify the configuration is valid.
- [ ] Commit with `chore: add production backend compose stack`.

### Task 6: Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] Update the architecture diagram to include Postgres, Redis, and the worker.
- [ ] Add a production backend section explaining migrations, queueing, health checks, and Docker Compose.
- [ ] Add resume/interview bullets for the upgraded backend architecture.
- [ ] Run backend and frontend test suites.
- [ ] Commit with `docs: describe production backend architecture`.
