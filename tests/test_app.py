import sqlite3
from io import BytesIO
from pathlib import Path

import pytest

import app as capibot


@pytest.fixture
def client(tmp_path):
    database_path = tmp_path / "test.sqlite3"
    upload_folder = tmp_path / "uploads"
    capibot.app.config.update(
        TESTING=True,
        SECRET_KEY="test-secret",
        ADMIN_PASSWORD="test-password",
        GEMINI_API_KEY="",
        DATABASE_PATH=str(database_path),
        UPLOAD_FOLDER=str(upload_folder),
    )
    capibot.init_db()
    with capibot.app.test_client() as test_client:
        yield test_client


def test_quick_question_uses_python_rule_and_records_origin(client):
    response = client.post(
        "/api/chat",
        json={"message": "Onde fica o elevador?", "origin": "Entrada", "session_id": ""},
    )

    assert response.status_code == 200
    result = response.get_json()
    assert "Praça de Alimentação, Ala Sul" in result["reply"]

    with sqlite3.connect(capibot.app.config["DATABASE_PATH"]) as connection:
        row = connection.execute("SELECT id, origin FROM sessions").fetchone()
    assert row == (result["session_id"], "Entrada")


def test_ticket_upload_is_saved_and_requires_admin_to_view(client):
    response = client.post(
        "/api/tickets",
        data={
            "message": "Preciso de ajuda",
            "origin": "SAC",
            "photo": (BytesIO(b"\xff\xd8\xff" + b"\x00" * 20), "foto.jpg"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    result = response.get_json()
    upload_folder = Path(capibot.app.config["UPLOAD_FOLDER"])
    assert len(list(upload_folder.glob("*.jpg"))) == 1
    assert client.get("/api/admin/tickets").status_code == 401

    login = client.post("/admin", data={"password": "test-password"})
    assert login.status_code == 302
    tickets = client.get("/api/admin/tickets")
    assert tickets.status_code == 200
    assert tickets.get_json()[0]["origin"] == "SAC"
    assert tickets.get_json()[0]["photo_url"]


def test_invalid_chat_payload_returns_validation_error(client):
    response = client.post(
        "/api/chat",
        json=["not", "an", "object"],
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]
