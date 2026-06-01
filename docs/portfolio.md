# Portfolio Notes

Use this page to prepare resume bullets and interview explanations for Repo Ready.

## Resume Bullets

- Built a full-stack repository readiness platform with React, TypeScript, FastAPI, Postgres, Redis/RQ, and Docker Compose to help students evaluate GitHub projects for SDE internship resumes.
- Designed an asynchronous analysis pipeline where FastAPI creates persistent jobs and Redis/RQ workers run long repository scans outside the request path.
- Implemented session-scoped access control with HTTP-only cookies, user-scoped history, job ownership checks, and protected job progress timelines.
- Added production backend safeguards including Redis-backed rate limiting, readiness checks, Alembic migrations, audit logging, and structured job lifecycle events.
- Developed deterministic repository scoring and AI mentor feedback with a rule-based fallback so demos and tests remain reliable without external API dependencies.

## Interview Narrative

**Problem:** Students can build projects, but they often do not know whether a GitHub repository is polished enough for a resume or technical interview.

**Solution:** Repo Ready scans public GitHub repositories, evaluates engineering signals, scores resume readiness, and turns the result into action plans, resume bullets, and interview prep.

**Backend angle:** The project is intentionally built like a production backend, not a single-process demo. Long-running work is queued, job state is persistent, user data is scoped, expensive operations are rate limited, and important events are auditable.

## Architecture Talking Points

- **Why queue jobs?** Repository cloning and static analysis can take seconds or minutes. Returning a `job_id` keeps the API responsive and lets workers scale independently.
- **Why persist job state?** If API memory is lost or a worker runs separately, clients can still poll status from the database.
- **Why job events?** A persisted timeline makes background work observable and gives users a clear explanation of what happened.
- **Why rate limit?** Clone/analyze work is expensive and can be abused. Redis counters protect the system with low latency.
- **Why audit logs?** Security and workflow events such as login, logout, rejected requests, and denied job views are useful for debugging and operational accountability.
- **Why fallback AI?** OpenAI enriches the user experience, but deterministic fallback logic keeps the product usable in demos, tests, and development.

## Production Features To Highlight

- Docker Compose stack with frontend, API, worker, Postgres, and Redis.
- FastAPI health endpoints split into liveness and dependency readiness.
- Alembic migrations for schema evolution.
- Redis/RQ worker process for asynchronous analysis.
- Postgres-backed analysis history and job state.
- HTTP-only cookie sessions for local user context.
- User-scoped history and job authorization.
- Redis-backed rate limiting for `/api/analyze`.
- Audit logging for important user and security events.
- Job progress timeline for observability.
- pytest, ruff, mypy, Vitest, production build, and GitHub Actions CI.

## Questions To Practice

**How does the async analysis flow work?**  
The API validates the URL, checks the session, applies rate limits, creates a database-backed job, records an audit event, and enqueues work. A Redis/RQ worker clones the repository, runs analysis, writes progress events, saves the final report, and marks the job done or failed.

**How did you protect user data?**  
History records and jobs include `user_id`. Every history/job endpoint derives the current user from the HTTP-only session cookie and returns `404` for records not owned by that user.

**What happens if OpenAI is unavailable?**  
The mentor service falls back to deterministic local feedback. The core repository analysis and readiness score do not depend on OpenAI.

**What would you improve next?**  
Add retry/dead-letter handling for transient worker failures, move development login to GitHub OAuth, and add dashboard views for audit/job event history.

## Short Project Pitch

Repo Ready is a production-style full-stack app that helps students decide whether a GitHub project is resume-ready. The interesting backend work is the asynchronous analysis pipeline: FastAPI accepts requests, Redis/RQ workers process long-running scans, Postgres persists job state and history, and the system includes session-scoped authorization, rate limiting, audit logs, and job progress timelines.
