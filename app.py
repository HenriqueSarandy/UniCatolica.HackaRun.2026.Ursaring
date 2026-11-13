import json
import hmac
import os
import sqlite3
import unicodedata
import uuid
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import (
    Flask,
    abort,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.utils import secure_filename


ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

app = Flask(__name__, instance_path=str(ROOT / "instance"))
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY", ""),
    ADMIN_PASSWORD=os.getenv("ADMIN_PASSWORD", ""),
    GEMINI_API_KEY=os.getenv("GEMINI_API_KEY", ""),
    GEMINI_MODEL=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    DATABASE_PATH=os.getenv("DATABASE_PATH", str(ROOT / "instance" / "capibot.sqlite3")),
    UPLOAD_FOLDER=os.getenv("UPLOAD_FOLDER", str(ROOT / "uploads")),
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def connect_db():
    connection = sqlite3.connect(app.config["DATABASE_PATH"])
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    Path(app.config["DATABASE_PATH"]).parent.mkdir(parents=True, exist_ok=True)
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    with connect_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                origin TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id),
                message TEXT NOT NULL,
                photo_filename TEXT,
                status TEXT NOT NULL DEFAULT 'novo',
                created_at TEXT NOT NULL
            );
            """
        )


def now_utc():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_or_create_session(connection, session_id, origin):
    try:
        session_id = str(uuid.UUID(session_id)) if session_id else str(uuid.uuid4())
    except (ValueError, TypeError, AttributeError):
        session_id = str(uuid.uuid4())

    timestamp = now_utc()
    connection.execute(
        """
        INSERT INTO sessions (id, origin, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            origin = CASE WHEN excluded.origin = '' THEN sessions.origin ELSE excluded.origin END,
            updated_at = excluded.updated_at
        """,
        (session_id, origin[:120], timestamp, timestamp),
    )
    return session_id


def normalize(text):
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def load_shopping_data():
    with (ROOT / "base-shopping.json").open(encoding="utf-8") as file:
        return json.load(file)


def find_quick_reply(message, connection, session_id):
    text = normalize(message)
    data = load_shopping_data()

    if "elevador" in text:
        elevator = next(
            (
                point
                for point in data["map_points"]
                if "elevador" in normalize(point["name"])
            ),
            None,
        )
        if elevator:
            return f"O elevador mais próximo fica em {elevator['location']}."
        return "A localização dos elevadores ainda não foi cadastrada. Consulte o SAC."

    if "reclam" in text or "registrar chamado" in text:
        timestamp = now_utc()
        cursor = connection.execute(
            """
            INSERT INTO tickets (session_id, message, created_at)
            VALUES (?, ?, ?)
            """,
            (session_id, message[:2000], timestamp),
        )
        return f"Chamado #{cursor.lastrowid} registrado. Nossa equipe poderá continuar o atendimento."

    if "loja" in text and ("abert" in text or "funcion" in text):
        stores = [
            store["name"]
            for store in data["stores"]
            if store.get("open_now") is True
        ]
        if stores:
            return "Lojas marcadas como abertas: " + ", ".join(stores) + "."
        return "Os horários das lojas ainda não foram cadastrados na base do shopping."

    if "inclusiv" in text or "acessibilidade" in text:
        info = next(
            (
                item["answer"]
                for item in data["services"]
                if "inclusiv" in normalize(item["name"])
            ),
            None,
        )
        if info:
            return info
        return "As informações sobre atendimento inclusivo ainda não foram cadastradas."

    return None


def respond_to_capibot_prompt(message, origin, connection, session_id):
    """Adapt the standalone CapiBot prototype rules to the Flask chat API."""
    text = normalize(message)

    if any(term in text for term in ("elevador", "cadeira", "acessibilidade")):
        data = load_shopping_data()
        elevator = next(
            (point for point in data["map_points"] if "elevador" in normalize(point["name"])),
            None,
        )
        if elevator:
            reply = f"Partindo de {origin or 'Entrada Principal'}, o elevador acessível fica em {elevator['location']}."
        else:
            reply = "A localização do elevador acessível ainda não foi cadastrada. Consulte o SAC."
        return {"reply": reply, "estado_avatar": "apontando_direita", "protocolo": None}

    if any(term in text for term in ("reclam", "problema", "sujo")):
        timestamp = now_utc()
        cursor = connection.execute(
            "INSERT INTO tickets (session_id, message, created_at) VALUES (?, ?, ?)",
            (session_id, message[:2000], timestamp),
        )
        protocol = f"CD-{cursor.lastrowid:06d}"
        return {
            "reply": f"Registrei sua ocorrência com prioridade sob o protocolo {protocol}. Nossa equipe de apoio já foi acionada.",
            "estado_avatar": "atencioso",
            "protocolo": protocol,
        }

    return None


def ask_gemini(message):
    api_key = app.config["GEMINI_API_KEY"]
    if not api_key:
        return None, "O atendimento para perguntas livres ainda não está configurado."

    from google import genai
    from google.genai import errors

    context = json.dumps(load_shopping_data(), ensure_ascii=False)
    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=app.config["GEMINI_MODEL"],
            contents=(
                "Responda em português usando somente as informações confirmadas "
                "na base abaixo. Se não encontrar a resposta, oriente a pessoa a "
                "consultar o SAC. Base do shopping: "
                f"{context}\n\nPergunta: {message}"
            ),
        )
    except errors.APIError:
        app.logger.exception("Falha ao consultar a API do Gemini")
        return None, "Não foi possível consultar o assistente agora. Tente novamente."

    if not response.text:
        return None, "O assistente não retornou uma resposta. Tente novamente."
    return response.text, None


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_authenticated"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "Autenticação necessária."}), 401
            return redirect(url_for("admin"))
        return view(*args, **kwargs)

    return wrapped


def valid_image_signature(upload, extension):
    header = upload.stream.read(12)
    upload.stream.seek(0)
    if extension in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".webp":
        return header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    return False


@app.get("/")
def home():
    return render_template("index.html")


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "O corpo da mensagem deve ser um objeto JSON."}), 400
    message = data.get("message", "")
    origin = data.get("origin", "")
    if not isinstance(message, str) or not message.strip() or len(message) > 2000:
        return jsonify({"error": "Digite uma mensagem de até 2.000 caracteres."}), 400
    if not isinstance(origin, str):
        return jsonify({"error": "A origem informada é inválida."}), 400

    with connect_db() as connection:
        session_id = get_or_create_session(
            connection, data.get("session_id"), origin.strip()
        )
        prompt_response = respond_to_capibot_prompt(
            message.strip(), origin.strip(), connection, session_id
        )
        reply = prompt_response["reply"] if prompt_response else find_quick_reply(
            message.strip(), connection, session_id
        )

    if reply is None:
        reply, error = ask_gemini(message.strip())
        if error:
            return jsonify({"error": error, "session_id": session_id}), 503

    result = {"reply": reply, "session_id": session_id}
    if prompt_response:
        result.update(
            estado_avatar=prompt_response["estado_avatar"],
            protocolo=prompt_response["protocolo"],
        )
    return jsonify(result)


@app.post("/api/tickets")
def create_ticket():
    message = request.form.get("message", "").strip()
    origin = request.form.get("origin", "").strip()
    if not message or len(message) > 2000:
        return jsonify({"error": "Descreva o chamado (até 2.000 caracteres)."}), 400
    if len(origin) > 120:
        return jsonify({"error": "A origem deve ter até 120 caracteres."}), 400

    upload = request.files.get("photo")
    filename = None
    destination = None
    if upload and upload.filename:
        extension = Path(secure_filename(upload.filename)).suffix.lower()
        if extension not in ALLOWED_IMAGE_EXTENSIONS or not valid_image_signature(
            upload, extension
        ):
            return jsonify({"error": "Envie uma foto JPG, PNG ou WEBP válida."}), 400
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = Path(app.config["UPLOAD_FOLDER"]) / filename

    with connect_db() as connection:
        session_id = get_or_create_session(
            connection, request.form.get("session_id"), origin
        )
        cursor = connection.execute(
            """
            INSERT INTO tickets (session_id, message, photo_filename, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, message, filename, now_utc()),
        )
        ticket_id = cursor.lastrowid
        if destination:
            upload.save(destination)

    return jsonify(
        {
            "ticket_id": ticket_id,
            "session_id": session_id,
            "message": "Chamado registrado com sucesso.",
        }
    ), 201


@app.get("/api/routes")
def route_lookup():
    origin = request.args.get("origin", "")
    destination = request.args.get("destination", "")
    with (ROOT / "routes.json").open(encoding="utf-8") as file:
        routes = json.load(file)["routes"]
    route = next(
        (
            item
            for item in routes
            if item["origin"] == origin and item["destination"] == destination
        ),
        None,
    )
    if route is None:
        return jsonify({"error": "Essa rota ainda não foi cadastrada."}), 404
    return jsonify(route)


@app.route("/admin", methods=["GET", "POST"])
def admin():
    if request.method == "POST":
        password = app.config["ADMIN_PASSWORD"]
        if not password:
            return render_template(
                "admin.html", setup_error="Configure ADMIN_PASSWORD no arquivo .env."
            ), 503
        if not hmac.compare_digest(request.form.get("password", ""), password):
            return render_template(
                "admin.html", login_error="Senha incorreta."
            ), 401
        session.clear()
        session["admin_authenticated"] = True
        return redirect(url_for("admin"))

    return render_template(
        "admin.html",
        authenticated=bool(session.get("admin_authenticated")),
    )


@app.post("/admin/logout")
@admin_required
def admin_logout():
    session.clear()
    return redirect(url_for("admin"))


@app.get("/api/admin/tickets")
@admin_required
def admin_tickets():
    with connect_db() as connection:
        tickets = connection.execute(
            """
            SELECT tickets.id, tickets.message, tickets.photo_filename,
                   tickets.status, tickets.created_at, sessions.origin
            FROM tickets JOIN sessions ON sessions.id = tickets.session_id
            ORDER BY tickets.id DESC LIMIT 100
            """
        ).fetchall()
    return jsonify(
        [
            {
                "id": ticket["id"],
                "message": ticket["message"],
                "photo_url": (
                    url_for("admin_upload", filename=ticket["photo_filename"])
                    if ticket["photo_filename"]
                    else None
                ),
                "status": ticket["status"],
                "created_at": ticket["created_at"],
                "origin": ticket["origin"] or "Não informada",
            }
            for ticket in tickets
        ]
    )


@app.get("/admin/uploads/<path:filename>")
@admin_required
def admin_upload(filename):
    filename = secure_filename(filename)
    if not filename:
        abort(404)
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "O arquivo deve ter no máximo 5 MB."}), 413


init_db()

if __name__ == "__main__":
    missing_settings = [
        name
        for name in ("SECRET_KEY", "ADMIN_PASSWORD")
        if not app.config[name]
    ]
    if missing_settings:
        raise RuntimeError(
            "Configure no arquivo .env: " + ", ".join(missing_settings)
        )
    app.run(host="127.0.0.1", port=5000, debug=False)
