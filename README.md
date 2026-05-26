# Code Review Agent

A Python-based repository analysis app for reviewing GitHub projects. The Day 1 version performs deterministic static analysis and presents a report through a FastAPI backend and Streamlit dashboard.

## Tech Stack

- Backend: FastAPI
- Frontend: Streamlit
- Core logic: Python services
- Tests: pytest

## Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## Run Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Run Frontend

In a second terminal:

```bash
cd frontend
../backend/.venv/bin/streamlit run streamlit_app.py
```

## Day 1 Features

- Analyze a public GitHub repository URL.
- Count source files and directories.
- Show language distribution.
- Identify largest files and long files.
- Detect missing README and missing test files.
- Generate a concise review summary.
