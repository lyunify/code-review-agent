from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="Code Review Agent",
    description="Analyze GitHub repositories and generate static review reports.",
    version="0.1.0",
)

app.include_router(router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
