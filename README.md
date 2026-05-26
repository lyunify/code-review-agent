# Code Review Agent

A Python-based repository analysis app that helps CS students judge whether a GitHub project is ready to put on a resume. It performs deterministic static analysis, calculates a resume readiness score, and presents a report through a FastAPI backend and Streamlit dashboard.

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
cp .env.example .env
```

Add your OpenAI API key to `backend/.env`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
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
- Save recent analysis history in SQLite.
- Calculate a resume readiness score with checklist-based feedback.
- Prioritize fixes before adding a project to a resume.
- Check README quality signals such as purpose, setup, usage, tech stack, and demo assets.
- Consider dependency files, docs, project structure, long files, and risk density.
- Generate mock mentor feedback with resume bullets, interview questions, and next steps.
- Use OpenAI-backed mentor feedback when `OPENAI_API_KEY` is configured, with rule-based fallback.

## API Endpoints

- `GET /health`: backend health check.
- `POST /api/analyze`: clone and analyze a public repository.
- `GET /api/history`: return recent saved analysis records.
