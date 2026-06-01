import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import history_store, router
from app.core import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(
    title="Code Review Agent",
    description="Analyze GitHub repositories and generate static review reports.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/live")
def liveness_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def readiness_check() -> dict[str, object]:
    try:
        history_store.check_database()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "checks": {
                    "database": "unavailable",
                },
            },
        ) from exc

    return {
        "status": "ready",
        "checks": {
            "database": "ok",
        },
    }
