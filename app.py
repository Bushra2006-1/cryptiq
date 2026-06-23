"""
app.py — CRYPTIQ Flask application.

Routes:
  GET  /                    Landing page (stamp + verify UI)
  POST /stamp                Upload file -> generate certificate
  POST /verify                Upload file -> check origin status
  GET  /recent                List the most recent certificates
  GET  /certificate/<id>      View a single certificate as JSON
"""

from __future__ import annotations

import os
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, session
from werkzeug.utils import secure_filename

from auth import authenticate_user, get_user_by_email, register_user
from paths import UPLOAD_DIR
from stamper import create_stamp
from verifier import delete_certificate_by_id, get_certificate_by_id, get_recent_certificates, verify_file

load_dotenv()

ALLOWED_ORIGINS = {"Human Made", "AI Generated"}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "cryptiq-dev-secret")
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


def _save_upload(file_storage) -> tuple[str, str]:
    """Persist an uploaded file to a temp path inside uploads/ and return (path, original_filename)."""
    original_name = secure_filename(file_storage.filename) or "upload.bin"
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    path = os.path.join(UPLOAD_DIR, unique_name)
    file_storage.save(path)
    return path, original_name


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    user, error = register_user(full_name, email, password)
    if error:
        return jsonify({"error": error}), 400

    session["user_email"] = user["email"]
    return jsonify({"success": True, "full_name": user["full_name"], "email": user["email"]})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    user, error = authenticate_user(email, password)
    if error:
        return jsonify({"error": error}), 401

    session["user_email"] = user["email"]
    return jsonify({"success": True, "full_name": user["full_name"], "email": user["email"]})


@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user_email", None)
    return jsonify({"success": True})


@app.route("/me")
def me():
    user = get_user_by_email(session.get("user_email"))
    if not user:
        return jsonify({"success": True, "logged_in": False})
    return jsonify({
        "success": True,
        "logged_in": True,
        "full_name": user["full_name"],
        "email": user["email"],
    })


@app.route("/stamp", methods=["POST"])
def stamp():
    current_user = get_user_by_email(session.get("user_email"))
    if current_user:
        creator = current_user["full_name"]
        private_key = current_user["private_key"]
    else:
        creator = (request.form.get("creator") or "").strip()
        private_key = None

    origin = (request.form.get("origin") or "").strip()
    uploaded_file = request.files.get("file")

    if not creator:
        return jsonify({"error": "Creator name is required."}), 400
    if origin not in ALLOWED_ORIGINS:
        return jsonify({"error": "Origin must be 'Human Made' or 'AI Generated'."}), 400
    if uploaded_file is None or uploaded_file.filename == "":
        return jsonify({"error": "A file is required."}), 400

    saved_path = None
    try:
        saved_path, original_name = _save_upload(uploaded_file)
        certificate = create_stamp(saved_path, original_name, creator, origin, private_key)
        return jsonify({"success": True, "certificate": certificate})
    finally:
        if saved_path and os.path.exists(saved_path):
            os.remove(saved_path)


@app.route("/verify", methods=["POST"])
def verify():
    uploaded_file = request.files.get("file")
    if uploaded_file is None or uploaded_file.filename == "":
        return jsonify({"error": "A file is required."}), 400

    saved_path = None
    try:
        saved_path, original_name = _save_upload(uploaded_file)
        result = verify_file(saved_path, original_name)
        return jsonify({"success": True, **result})
    finally:
        if saved_path and os.path.exists(saved_path):
            os.remove(saved_path)


@app.route("/recent")
def recent():
    limit = request.args.get("limit", default=5, type=int)
    limit = max(1, min(limit, 50))
    return jsonify({"success": True, "certificates": get_recent_certificates(limit)})


@app.route("/certificate/<stamp_id>")
def certificate(stamp_id):
    cert = get_certificate_by_id(stamp_id)
    if cert is None:
        return jsonify({"error": "Certificate not found."}), 404
    return jsonify(cert)


@app.route("/certificate/<stamp_id>", methods=["DELETE"])
def delete_certificate(stamp_id):
    if not delete_certificate_by_id(stamp_id):
        return jsonify({"error": "Certificate not found."}), 404
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
