"""
verifier.py — CRYPTIQ Verification Engine.

Takes an uploaded file, computes its SHA-256 fingerprint, and checks it
against every certificate stored in stamps/ to determine origin status.
"""

import json
import os

from stamper import hash_file
from tee import verify_tee_proof

STAMPS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stamps")


def _load_all_certificates() -> list[dict]:
    """Load every certificate on disk, newest first, so hash collisions resolve to the latest stamp."""
    certificates = []
    if not os.path.isdir(STAMPS_DIR):
        return certificates
    for filename in os.listdir(STAMPS_DIR):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(STAMPS_DIR, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                certificates.append(json.load(f))
        except (json.JSONDecodeError, OSError):
            continue
    certificates.sort(key=lambda c: c.get("timestamp", ""), reverse=True)
    return certificates


def verify_file(file_path: str, file_name: str) -> dict:
    """
    Verify an uploaded file's origin.

    Returns a dict with:
      status: "VERIFIED" | "NO_STAMP_FOUND" | "TAMPERED"
      certificate: the matching certificate, if any
      computed_hash: the SHA-256 of the uploaded file
    """
    computed_hash = hash_file(file_path)
    certificates = _load_all_certificates()

    exact_match = None
    name_match_but_hash_differs = None

    for cert in certificates:
        if cert.get("file_hash") == computed_hash:
            exact_match = cert
            break
        if cert.get("file_name") == file_name and name_match_but_hash_differs is None:
            name_match_but_hash_differs = cert

    if exact_match is not None:
        tee_valid = verify_tee_proof(
            exact_match["file_hash"],
            exact_match["creator"],
            exact_match["origin"],
            exact_match["timestamp"],
            exact_match,
        )
        return {
            "status": "VERIFIED" if tee_valid else "TAMPERED",
            "certificate": exact_match,
            "computed_hash": computed_hash,
        }

    if name_match_but_hash_differs is not None:
        return {
            "status": "TAMPERED",
            "certificate": name_match_but_hash_differs,
            "computed_hash": computed_hash,
        }

    return {
        "status": "NO_STAMP_FOUND",
        "certificate": None,
        "computed_hash": computed_hash,
    }


def get_recent_certificates(limit: int = 5) -> list[dict]:
    """Return the most recently issued certificates, newest first."""
    return _load_all_certificates()[:limit]


def get_certificate_by_id(stamp_id: str) -> dict | None:
    path = os.path.join(STAMPS_DIR, f"{stamp_id}.json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def delete_certificate_by_id(stamp_id: str) -> bool:
    """Permanently remove a certificate's JSON file from stamps/. Returns True if deleted."""
    path = os.path.join(STAMPS_DIR, f"{stamp_id}.json")
    if not os.path.isfile(path):
        return False
    os.remove(path)
    return True
