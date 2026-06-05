"""
utils/tokens.py
B2 — Signed liveness-proof tokens.

When liveness passes, we issue a short-lived HMAC-signed token.
The sync API checks this token before accepting attendance records,
preventing replay of attendance without a real liveness check.

Token format (URL-safe base64):
    <person_id>.<unix_ts>.<hmac_sha256_hex[:16]>
"""

import hmac
import hashlib
import time
import base64
import os
from typing import Optional

# In prod: load from AWS Secrets Manager. For hackathon: env var with fallback.
_SECRET = os.environ.get("LIVENESS_TOKEN_SECRET", "dev-secret-change-in-prod").encode()
TOKEN_TTL = 300   # 5 minutes — enough to record + sync


def issue_token(person_id: str) -> str:
    ts = str(int(time.time()))
    payload = f"{person_id}.{ts}"
    sig = hmac.new(_SECRET, payload.encode(), hashlib.sha256).hexdigest()[:16]
    raw = f"{payload}.{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def verify_token(token: str, person_id: str) -> tuple[bool, str]:
    """
    Returns (valid: bool, reason: str).
    """
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split(".")
        if len(parts) != 3:
            return False, "malformed token"

        tok_person, ts_str, sig = parts

        if tok_person != person_id:
            return False, "person_id mismatch"

        if time.time() - int(ts_str) > TOKEN_TTL:
            return False, "token expired"

        expected_payload = f"{tok_person}.{ts_str}"
        expected_sig = hmac.new(_SECRET, expected_payload.encode(), hashlib.sha256).hexdigest()[:16]

        if not hmac.compare_digest(sig, expected_sig):
            return False, "invalid signature"

        return True, "ok"

    except Exception as e:
        return False, f"token error: {e}"
