import json
import sqlite3
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DATABASE_PATH = ROOT / "campushire.sqlite3"
HOST = "127.0.0.1"
PORT = 8000
MAX_REQUEST_BYTES = 8 * 1024 * 1024


def initialize_database():
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS app_state ("
            "id INTEGER PRIMARY KEY CHECK (id = 1), "
            "state_json TEXT NOT NULL, "
            "updated_at TEXT NOT NULL)"
        )


class CampusHireHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        if urlsplit(path).path == "/":
            path = "/index (1).html"
        return super().translate_path(path)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlsplit(self.path).path != "/api/state":
            return super().do_GET()

        with sqlite3.connect(DATABASE_PATH) as connection:
            row = connection.execute(
                "SELECT state_json FROM app_state WHERE id = 1"
            ).fetchone()
        saved_state = json.loads(row[0]) if row else None
        self.send_json(200, {"state": saved_state})

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/state":
            self.send_json(404, {"error": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "Invalid content length"})
            return

        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self.send_json(413, {"error": "Request body is empty or too large"})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Request body must be valid JSON"})
            return

        state = payload.get("state") if isinstance(payload, dict) else None
        if not (
            isinstance(state, dict)
            and isinstance(state.get("profile"), dict)
            and isinstance(state.get("drives"), list)
            and isinstance(state.get("applications"), list)
        ):
            self.send_json(400, {"error": "State must contain profile, drives, and applications"})
            return

        state_json = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        updated_at = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(DATABASE_PATH) as connection:
            connection.execute(
                "INSERT INTO app_state (id, state_json, updated_at) VALUES (1, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, "
                "updated_at = excluded.updated_at",
                (state_json, updated_at),
            )
        self.send_json(200, {"saved": True, "updatedAt": updated_at})


def main():
    initialize_database()
    server = ThreadingHTTPServer((HOST, PORT), CampusHireHandler)
    print(f"CampusHire running at http://{HOST}:{PORT}/")
    print(f"SQLite database: {DATABASE_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCampusHire server stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()