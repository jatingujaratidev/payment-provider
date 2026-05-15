# Security & PCI-DSS notes

This repository is a **reference implementation** for engineering interviews and learning. It applies several controls aligned with PCI-DSS themes but **does not** by itself make you PCI Level 1 compliant.

## What is implemented

- **Data minimization**: Full PAN is never returned from APIs; only `last_four`, brand, expiry, and opaque `token` are exposed. CVV is never accepted on DTOs (`forbidNonWhitelisted` rejects unknown fields such as `cvv`).
- **Encryption at rest (application layer)**: PAN is encrypted with **AES-256-GCM** before persistence. IV and auth tag are stored separately. The key material is loaded from `CARD_ENCRYPTION_KEY` and hashed with SHA-256 to derive a 32-byte AES key (reduces risk of weak key sizing while still requiring a long configuration secret).
- **Strong password storage**: bcrypt with cost factor 12.
- **Transport assumptions**: Helmet security headers, CORS allowlist, JWT authentication on sensitive routes, throttling for brute-force and abuse scenarios.
- **Structured logging**: Correlation IDs and explicit redaction helpers; PAN/CVV-like fields must not be logged by convention.
- **SQL injection**: TypeORM query builders / repositories; no string-concatenated SQL in business code.

## What full PCI compliance would still require

- Formal **PCI DSS assessment** (ROC / SAQ) against your full cardholder environment.
- **Network segmentation**, hardened OS baseline, file integrity monitoring, centralized logging and alerting, access control reviews, key ceremonies, and **HSM** or cloud KMS for key storage and rotation.
- **PAN truncation/tokenization** via a PCI-listed P2PE solution or token service where PAN never touches your servers (best practice).
- **Quarterly ASV scans**, penetration testing, incident response runbooks, and personnel training.

## Encryption approach

1. Client sends PAN once over TLS to `POST /cards`.
2. Server validates Luhn, derives AES key from `CARD_ENCRYPTION_KEY`, encrypts PAN, stores ciphertext + IV + tag.
3. Payments reference the opaque `token` only; the mock bank never receives real PAN.

## Token security model

- `token` is 64 hex characters from `crypto.randomBytes(32)`; treat as a secret bearer reference bound to the user account.
- Compromise of the database still requires the encryption key to recover PANs—protect key material like any root secret (KMS, vault, rotation, least privilege).

## Explicitly NOT stored

- **CVV / CVC / CID** (never persisted, even encrypted).
- **Full PAN in plaintext** (only encrypted payload + display fields).
- **Mag stripe** or **PIN block** data.

## Metrics and health endpoints

They are marked `@Public()` for demonstration. In production, place them behind network ACLs, mTLS, or an admin-only gateway.
