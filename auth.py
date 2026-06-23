"""
auth.py — CRYPTIQ Account System.

Minimal user registry for the STAMP IT panel: registration, login, and a
per-user private signing key generated at registration time. Users are
persisted to users.json with hashed passwords (werkzeug.security).
"""

from __future__ import annotations

import json
import os
import secrets

from werkzeug.security import check_password_hash, generate_password_hash

from paths import USERS_FILE


def _load_users() -> dict:
    if not os.path.isfile(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_users(users: dict) -> None:
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def register_user(full_name: str, email: str, password: str) -> tuple[dict | None, str | None]:
    """Create a new user account. Returns (user, error)."""
    email = email.strip().lower()
    users = _load_users()
    if not full_name.strip() or not email or not password:
        return None, "Full name, email, and password are required."
    if email in users:
        return None, "An account with this email already exists."

    user = {
        "full_name": full_name.strip(),
        "email": email,
        "password_hash": generate_password_hash(password),
        "private_key": secrets.token_hex(32),
    }
    users[email] = user
    _save_users(users)
    return user, None


def authenticate_user(email: str, password: str) -> tuple[dict | None, str | None]:
    """Check credentials. Returns (user, error)."""
    email = email.strip().lower()
    users = _load_users()
    user = users.get(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return None, "Invalid email or password."
    return user, None


def get_user_by_email(email: str) -> dict | None:
    if not email:
        return None
    return _load_users().get(email.strip().lower())
