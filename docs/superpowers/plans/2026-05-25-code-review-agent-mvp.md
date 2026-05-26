# Code Review Agent MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Day 1 MVP for a Python repository analysis web app.

**Architecture:** FastAPI exposes a single `/analyze` endpoint. Service modules handle repository loading, static analysis, and report generation. Streamlit provides a Python-first demo UI.

**Tech Stack:** Python, FastAPI, Pydantic, GitPython, pytest, httpx, Streamlit.

---

### File Structure

- `backend/app/main.py`: creates the FastAPI app and mounts routes.
- `backend/app/api/routes.py`: defines the `/api/analyze` endpoint.
- `backend/app/core/config.py`: keeps scan thresholds and ignored folders.
- `backend/app/models/schemas.py`: defines request and response schemas.
- `backend/app/services/repo_loader.py`: clones a public Git repository.
- `backend/app/services/analyzer.py`: scans a local repository and returns deterministic metrics.
- `backend/app/services/report_generator.py`: turns metrics into a readable report summary.
- `backend/tests/test_analyzer.py`: tests static analysis with local temp files.
- `backend/tests/test_api.py`: tests the API with the clone function monkeypatched.
- `frontend/streamlit_app.py`: renders the demo dashboard.

### Task 1: Project Setup

- [ ] Create package marker files under `backend/app/`.
- [ ] Add `.gitignore`, dependency files, and environment example.
- [ ] Create a Python virtual environment in `backend/.venv`.
- [ ] Install dependencies from `backend/requirements.txt`.

### Task 2: Analyzer Test and Implementation

- [ ] Write analyzer tests that create temporary Python, JavaScript, README, and test files.
- [ ] Run analyzer tests and confirm they fail because `analyze_repository` does not exist.
- [ ] Implement `analyze_repository(path)` with language counts, total files, largest files, and risks.
- [ ] Re-run analyzer tests and confirm they pass.

### Task 3: API Test and Implementation

- [ ] Write API tests for `POST /api/analyze`.
- [ ] Run API tests and confirm they fail before the route exists.
- [ ] Implement schemas, route, app creation, repo loader integration, and report generation.
- [ ] Re-run API tests and confirm they pass.

### Task 4: Frontend and Docs

- [ ] Add Streamlit frontend that calls the backend endpoint.
- [ ] Add architecture documentation and root README instructions.
- [ ] Run the full pytest suite.
- [ ] Start the backend and frontend locally for manual demo verification.
