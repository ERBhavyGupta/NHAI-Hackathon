"""
tests/test_sync_api.py
B2 — Integration tests for sync routes using FastAPI TestClient.
DynamoDB is mocked — no real AWS creds needed.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from api.app import app

client = TestClient(app)


# ── /health ────────────────────────────────────────────────────────────────────

def test_health_endpoint():
    with patch("api.app.health_check", return_value=True):
        resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["dynamo_reachable"] is True


# ── /liveness/start ────────────────────────────────────────────────────────────

def test_start_session():
    resp = client.post("/liveness/start", json={
        "person_id": "EMP001",
        "num_challenges": 2
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert len(data["challenges"]) == 2
    assert data["expires_in_seconds"] == 30


def test_start_session_invalid_challenges():
    resp = client.post("/liveness/start", json={
        "person_id": "EMP001",
        "num_challenges": 99   # > max 4
    })
    assert resp.status_code == 422   # validation error


# ── /liveness/frame ────────────────────────────────────────────────────────────

def test_push_frame_bad_session():
    resp = client.post("/liveness/frame", json={
        "session_id": "nonexistent-session",
        "frame_b64": "aGVsbG8="
    })
    assert resp.status_code == 404


def test_push_frame_valid_session():
    # Create session first
    start = client.post("/liveness/start", json={
        "person_id": "EMP002",
        "num_challenges": 1
    })
    session_id = start.json()["session_id"]

    # Push a frame (1×1 white JPEG)
    import base64, io
    from PIL import Image
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    resp = client.post("/liveness/frame", json={
        "session_id": session_id,
        "frame_b64": b64,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "passed" in data
    assert "failed" in data
    assert "prompt" in data


# ── /sync/attendance ───────────────────────────────────────────────────────────

def _make_sync_body(with_token: bool = False):
    from utils.tokens import issue_token
    records = [
        {
            "id": "rec-001",
            "person_id": "EMP001",
            "timestamp": "2026-05-30T08:00:00",
            "latitude": 19.2183,
            "longitude": 72.9781,
            "liveness_token": issue_token("EMP001") if with_token else None,
        }
    ]
    return {"device_id": "DEVICE-XYZ", "records": records}


def test_sync_without_token():
    with patch("api.app.batch_write", return_value=(1, [])):
        resp = client.post("/sync/attendance", json=_make_sync_body(with_token=False))
    assert resp.status_code == 200
    assert resp.json()["synced_count"] == 1


def test_sync_with_valid_token():
    with patch("api.app.batch_write", return_value=(1, [])):
        resp = client.post("/sync/attendance", json=_make_sync_body(with_token=True))
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced_count"] == 1
    assert data["failed_ids"] == []


def test_sync_with_invalid_token():
    body = _make_sync_body(with_token=False)
    body["records"][0]["liveness_token"] = "invalid.token.here"
    with patch("api.app.batch_write", return_value=(0, [])):
        resp = client.post("/sync/attendance", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced_count"] == 0
    assert "rec-001" in data["failed_ids"]


def test_sync_bad_timestamp():
    body = {
        "device_id": "DEV-001",
        "records": [{
            "person_id": "EMP001",
            "timestamp": "not-a-date",   # invalid
        }]
    }
    resp = client.post("/sync/attendance", json=body)
    assert resp.status_code == 422


# ── /sync/purge-confirm ────────────────────────────────────────────────────────

def test_purge_confirm():
    resp = client.post("/sync/purge-confirm", json={
        "device_id": "DEVICE-XYZ",
        "purged_ids": ["rec-001", "rec-002"],
        "purged_at": "2026-05-30T08:05:00",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["acknowledged"] is True
    assert data["purged_count"] == 2
