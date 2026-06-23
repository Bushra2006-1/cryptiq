"""
tee.py — Simulated Trusted Execution Environment (TEE) for CRYPTIQ.

In production this module would talk to real enclave hardware (Intel SGX,
AWS Nitro Enclaves, AMD SEV). For this build we simulate the enclave
boundary deterministically using HMAC-SHA256 so the signature is still a
genuine cryptographic binding of (file hash + creator + timestamp) to a
secret enclave key that never leaves this module.
"""

import hashlib
import hmac
import os
import secrets
import time

from dotenv import load_dotenv

load_dotenv()

TEE_MASTER_KEY = os.getenv("TEE_MASTER_KEY", "cryptiq-tee-master-seed-2026").encode()

ENCLAVE_REGION = "us-east-1a"
ENCLAVE_PLATFORM = "CRYPTIQ-SIM-ENCLAVE/v1"


def _derive_enclave_id() -> str:
    """Generate a unique enclave session identifier, formatted like a hardware enclave ID."""
    raw = secrets.token_hex(8)
    return f"enc_{raw[:4]}-{raw[4:8]}-{raw[8:12]}-{raw[12:16]}"


def generate_tee_proof(file_hash: str, creator: str, origin: str, timestamp: str) -> dict:
    """
    Seal a piece of provenance data inside the simulated enclave and return a
    cryptographic attestation proving the data was signed inside the TEE
    boundary, without exposing the master key.
    """
    enclave_id = _derive_enclave_id()
    attestation_nonce = secrets.token_hex(16)

    payload = "|".join([file_hash, creator, origin, timestamp, enclave_id, attestation_nonce])

    signature = hmac.new(TEE_MASTER_KEY, payload.encode(), hashlib.sha256).hexdigest()

    attestation_digest = hashlib.sha256(
        f"{ENCLAVE_PLATFORM}:{enclave_id}:{signature}".encode()
    ).hexdigest()[:32]

    return {
        "tee_enclave_id": enclave_id,
        "tee_signature": signature,
        "tee_platform": ENCLAVE_PLATFORM,
        "tee_region": ENCLAVE_REGION,
        "tee_attestation_nonce": attestation_nonce,
        "tee_attestation_digest": attestation_digest,
        "tee_sealed_at": int(time.time()),
    }


def verify_tee_proof(file_hash: str, creator: str, origin: str, timestamp: str, proof: dict) -> bool:
    """Re-derive the HMAC signature and confirm it matches what the enclave produced at stamp time."""
    try:
        payload = "|".join([
            file_hash,
            creator,
            origin,
            timestamp,
            proof["tee_enclave_id"],
            proof["tee_attestation_nonce"],
        ])
        expected_signature = hmac.new(TEE_MASTER_KEY, payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_signature, proof.get("tee_signature", ""))
    except (KeyError, TypeError):
        return False
