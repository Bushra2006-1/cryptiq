"""
stamper.py — CRYPTIQ Stamp Engine.

Takes an uploaded file plus creator metadata, computes its SHA-256
fingerprint, seals it inside the simulated TEE, and writes a permanent
origin certificate to disk.
"""

import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone

from tee import generate_tee_proof

STAMPS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stamps")
CRYPTIQ_VERSION = "1.0"


def hash_file(file_path: str) -> str:
    """Compute the SHA-256 fingerprint of a file on disk, streamed in chunks."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def _generate_stamp_id() -> str:
    return f"cq_{uuid.uuid4().hex[:12]}"


def find_existing_stamp_by_hash(file_hash: str) -> dict | None:
    """Check whether this exact file content has already been stamped."""
    if not os.path.isdir(STAMPS_DIR):
        return None
    for filename in os.listdir(STAMPS_DIR):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(STAMPS_DIR, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                cert = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        if cert.get("file_hash") == file_hash:
            return cert
    return None


def create_stamp(
    file_path: str,
    file_name: str,
    creator: str,
    origin: str,
    private_key: str | None = None,
) -> dict:
    """
    Generate a full CRYPTIQ origin certificate for an uploaded file.

    If `private_key` is provided (the registered creator's signing key), the
    certificate also carries a digital signature binding the creator's
    identity to the file hash.

    Returns the certificate dict and also persists it to stamps/<stamp_id>.json.
    """
    file_hash = hash_file(file_path)
    timestamp = datetime.now(timezone.utc).isoformat()
    stamp_id = _generate_stamp_id()

    tee_proof = generate_tee_proof(file_hash, creator, origin, timestamp)

    creator_signature = None
    if private_key:
        creator_signature = hmac.new(
            private_key.encode(), f"{file_hash}|{creator}".encode(), hashlib.sha256
        ).hexdigest()

    certificate = {
        "stamp_id": stamp_id,
        "creator": creator,
        "origin": origin,
        "timestamp": timestamp,
        "file_name": file_name,
        "file_hash": file_hash,
        "tee_enclave_id": tee_proof["tee_enclave_id"],
        "tee_signature": tee_proof["tee_signature"],
        "tee_platform": tee_proof["tee_platform"],
        "tee_region": tee_proof["tee_region"],
        "tee_attestation_nonce": tee_proof["tee_attestation_nonce"],
        "tee_attestation_digest": tee_proof["tee_attestation_digest"],
        "tamper_proof": True,
        "cryptiq_version": CRYPTIQ_VERSION,
        "identity_verified": creator_signature is not None,
        "creator_signature": creator_signature,
    }

    os.makedirs(STAMPS_DIR, exist_ok=True)
    out_path = os.path.join(STAMPS_DIR, f"{stamp_id}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(certificate, f, indent=2)

    return certificate
