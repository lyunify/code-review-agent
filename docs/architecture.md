# Architecture

`code-review-agent` is split into a Python backend, a polished React frontend, and a legacy Streamlit quick demo.

## Backend

The FastAPI backend accepts analysis requests, clones public repositories, runs static analysis, calculates resume readiness, saves a compact history record in SQLite, and returns structured JSON. The API layer stays thin; core behavior lives in services so it can be tested without HTTP.

## Frontend

The React frontend is the primary portfolio demo. It calls the backend API, then renders resume readiness, AI mentor feedback, checklist results, technical scan details, and history. The Streamlit frontend remains available as a lightweight local fallback.

## Service Boundaries

- `repo_loader`: gets source code onto disk.
- `analyzer`: inspects files and computes metrics.
- `readiness`: calculates a resume readiness score, checklist, and priority fixes using documentation, testing, dependency, structure, and risk-density signals.
- `mentor_agent`: generates OpenAI-backed mentor feedback when an API key is configured, with a rule-based fallback for local demos and tests.
- `report_generator`: turns metrics into user-facing interpretation.
- `db`: stores recent analysis history in SQLite.
- `routes`: handles HTTP request and response flow.
