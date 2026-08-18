"""Flask application factory."""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from .db import connect, init_db, is_empty
from .errors import ServiceError
from .repo import Repo
from .routes import api
from .seed import seed_conn
from .services import Services


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def create_app(config: dict | None = None) -> Flask:
    here = Path(__file__).resolve().parent
    backend_root = here.parent
    instance = backend_root / "instance"
    instance.mkdir(parents=True, exist_ok=True)

    frontend_override = os.environ.get("TWOLATE_FRONTEND_DIST")
    frontend_dist = Path(frontend_override) if frontend_override else (_repo_root() / "frontend" / "dist")

    app = Flask(
        __name__,
        instance_path=str(instance),
        static_folder=str(frontend_dist) if frontend_dist.exists() else None,
        static_url_path="/",
    )
    app.config.update(
        SECRET_KEY=os.environ.get("TWOLATE_SECRET", "2late-dev-secret"),
        DATABASE=os.environ.get("TWOLATE_DB", str(instance / "2late.db")),
        UPLOADS=os.environ.get("TWOLATE_UPLOADS", str(instance / "uploads")),
        JSON_AS_ASCII=False,
    )
    if config:
        app.config.update(config)

    db_path = app.config["DATABASE"]
    uploads = Path(app.config["UPLOADS"])
    uploads.mkdir(parents=True, exist_ok=True)

    conn = connect(db_path)
    init_db(conn)
    if is_empty(conn):
        seed_conn(conn, uploads_dir=uploads)

    app.db = conn  # type: ignore[attr-defined]
    app.services = Services(Repo(conn), uploads)  # type: ignore[attr-defined]

    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(api)

    @app.errorhandler(ServiceError)
    def handle_service_error(err: ServiceError):
        return jsonify({"error": err.message}), err.status

    @app.get("/api/meta")
    def meta():
        return jsonify({"name": "2late", "framework": "flask"})

    if frontend_dist.exists():

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def spa(path: str):
            if path.startswith("api/"):
                return jsonify({"error": "Not found"}), 404
            target = frontend_dist / path
            if path and target.exists() and target.is_file():
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, "index.html")

    @app.teardown_appcontext
    def _close(_exc):
        return None

    return app
