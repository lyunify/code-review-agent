from fastapi.testclient import TestClient

from app.main import app


def test_cors_allows_local_react_frontend() -> None:
    client = TestClient(app)

    response = client.options(
        "/api/history",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
