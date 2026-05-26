# Code Review Agent Design

## Goal

Build a Python-based repository analysis tool that accepts a GitHub repository URL, scans the codebase, and produces a practical code quality report for early engineering review.

## Day 1 Scope

The first version focuses on deterministic static analysis, not LLM output. It should clone a public GitHub repository, inspect source files, calculate basic project metrics, identify simple quality risks, and expose the result through a FastAPI backend and a Streamlit dashboard.

## Architecture

The project uses a lightweight full-stack structure. `backend/` contains the FastAPI API and core Python services. `frontend/` contains a Streamlit app that calls the backend. Business logic lives in `backend/app/services/` so it can be tested independently from the API.

## Core Components

- `repo_loader.py` clones a public repository into a temporary local directory.
- `analyzer.py` walks a local repository and returns file counts, language distribution, largest files, and risk signals.
- `report_generator.py` converts raw analysis into a concise human-readable summary.
- `routes.py` exposes an `/analyze` API endpoint.
- `streamlit_app.py` provides a simple dashboard for demo use.

## Data Flow

1. User enters a GitHub repository URL in the frontend.
2. Frontend sends the URL to the FastAPI backend.
3. Backend clones the repository into a temporary directory.
4. Analyzer scans the cloned files and computes metrics.
5. Report generator adds summary text and recommendations.
6. API returns structured JSON to the frontend.
7. Frontend renders metrics, risk signals, and report text.

## Testing Strategy

Day 1 tests cover the analyzer and API contract. Analyzer tests use a small temporary repository fixture so they do not require network access. API tests monkeypatch the clone step and verify that `/analyze` returns the expected response shape.

## Future Extensions

- Add LLM-powered review comments.
- Add SQLite storage for analysis history.
- Add GitHub pull request diff analysis.
- Replace Streamlit with React and TypeScript.
- Add Docker and deployment configuration.
