"""
paths.py — Storage paths for CRYPTIQ, environment aware.

Vercel serverless functions ship a read-only project filesystem; only /tmp
is writable at runtime. Locally we keep using paths next to the source so
existing data (stamps/, users.json) keeps working unchanged.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_IS_SERVERLESS = bool(os.environ.get("VERCEL"))
_WRITABLE_ROOT = "/tmp/cryptiq" if _IS_SERVERLESS else BASE_DIR

UPLOAD_DIR = os.path.join(_WRITABLE_ROOT, "uploads")
STAMPS_DIR = os.path.join(_WRITABLE_ROOT, "stamps")
USERS_FILE = os.path.join(_WRITABLE_ROOT, "users.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STAMPS_DIR, exist_ok=True)
