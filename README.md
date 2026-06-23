# CRYPTIQ

**Trust Every File. Verify Every Origin.**

CRYPTIQ is a lightweight web application that lets creators cryptographically "stamp" their files at the moment of creation and lets anyone else verify that a file hasn't been altered since. By generating a SHA-256 fingerprint of each file inside a simulated Trusted Execution Environment (TEE) and issuing a tamper-evident certificate, CRYPTIQ gives images, documents, and media a verifiable chain of custody from origin to distribution.

## The Problem

AI-generated content and deepfakes are eroding trust in everything we see online. Photos, videos, and documents can now be fabricated or subtly altered with a level of realism that makes manual detection nearly impossible. The world lacks a simple, accessible way to prove that a file is exactly what its creator published — unmodified, unedited, and authentic. CRYPTIQ addresses this by putting origin verification directly in the hands of creators, rather than relying on after-the-fact forensic analysis.

## Features

- **Stamp It** — Generate a cryptographic certificate for any file at the moment of creation, sealing its content and metadata.
- **Verify It** — Upload any file to instantly check whether it matches an existing certificate and has not been tampered with.
- **TEE Security** — Stamping operations run inside a simulated Trusted Execution Environment to protect the integrity of the signing process.
- **SHA-256 Fingerprinting** — Every file is hashed with SHA-256 to produce a unique, tamper-evident fingerprint.
- **Recent Certificates** — Browse a log of recently issued stamps and their verification status.
- **Login System** — User authentication to associate certificates with their creators.

## Tech Stack

- **Python** — core application logic
- **Flask** — web server and routing
- **SHA-256** — cryptographic hashing for file fingerprinting
- **Simulated TEE** — isolated, tamper-resistant stamping process
- **JSON Storage** — lightweight storage for certificates and user data

## How to Run Locally

```bash
git clone https://github.com/Bushra2006-1/cryptiq.git
cd cryptiq
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000` in your browser.

## How It Works

1. **Upload** — A creator uploads a file they want to protect.
2. **Stamp** — CRYPTIQ computes a SHA-256 hash of the file inside the simulated TEE and issues a signed certificate.
3. **Store** — The certificate (hash, timestamp, metadata) is saved and linked to the file's unique fingerprint.
4. **Verify** — Anyone can later upload the same file to check its hash against the stored certificate and confirm it's unaltered.

## Future Roadmap

- **Blockchain Anchoring** — Anchor certificates on a public blockchain for immutable, decentralized proof of origin.
- **Real TEE Hardware** — Move from a simulated TEE to real hardware-backed enclaves (e.g., Intel SGX, AWS Nitro) for stronger security guarantees.
- **API for Platforms** — Offer a public API so social media platforms, news outlets, and publishers can verify content at scale.

## Built By

Bushra Zafar — Hackathon 2026
