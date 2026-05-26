# Code Review Agent

An AI-assisted repository readiness platform that helps CS students evaluate whether a GitHub project is strong enough to include on an SDE internship resume. It analyzes public repositories, scores project readiness, generates prioritized improvement plans, and turns technical signals into resume and interview preparation guidance.

## Tech Stack

- Backend: FastAPI
- Frontend: React, TypeScript, Vite
- Data storage: SQLite
- AI feedback: OpenAI API with rule-based fallback
- Legacy prototype: Streamlit
- Core logic: Python services
- Tests: pytest, Vitest

## Product Capabilities

- Analyze public GitHub repositories from a URL.
- Score resume readiness with a checklist-based rubric.
- Inspect repository structure, languages, file counts, largest files, and risk signals.
- Evaluate README quality, setup instructions, usage notes, tech stack documentation, and demo assets.
- Detect project hygiene signals such as tests, dependency files, docs, `.gitignore`, and `.env.example`.
- Generate prioritized action plans that explain what to fix, why it matters, and how it improves resume value.
- Produce AI mentor feedback with resume bullets, interview questions, and next steps.
- Save analysis history in SQLite and reopen saved reports from the dashboard.
- Export a Markdown readiness report for portfolio review or interview preparation.

## Screenshots

Screenshots will be added after the frontend polish pass.

| Dashboard | Action Plan | AI Mentor |
| --- | --- | --- |
| _Coming soon_ | _Coming soon_ | _Coming soon_ |

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

Install the React frontend:

```bash
cd ../frontend/web
npm install
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

## Run React Frontend

In a second terminal:

```bash
cd frontend/web
npm run dev
```

Open `http://127.0.0.1:5173`.

## Run Streamlit Frontend

In a second terminal:

```bash
cd frontend
../backend/.venv/bin/streamlit run streamlit_app.py
```

## API Endpoints

- `GET /health`: backend health check.
- `POST /api/analyze`: clone and analyze a public repository.
- `GET /api/history`: return recent saved analysis records.
- `GET /api/history/{record_id}`: reopen a saved analysis report.
