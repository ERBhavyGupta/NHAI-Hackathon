"""
api/app.py
B2 — FastAPI application.

Routes:
  POST /liveness/start          → create session, get challenges
  POST /liveness/frame          → push frame, get status
  POST /sync/attendance         → bulk-write attendance records to DynamoDB
  POST /sync/purge-confirm      → app confirms local DB purged
  GET  /health                  → service health check

Run locally:
  uvicorn api.app:app --reload --port 8000
"""

import time
import secrets
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    StartSessionRequest, StartSessionResponse,
    FrameRequest, FrameResponse,
    SyncRequest, SyncResponse,
    PurgeConfirmation, HealthResponse,
)
from utils.session_store import session_store
from utils.tokens import issue_token, verify_token
from sync.dynamo import batch_write, health_check

_start_time = time.time()

app = FastAPI(
    title="Datalake 3.0 — Face Auth Backend",
    version="1.0.0",
    description="Liveness detection + offline attendance sync for Hackathon 7.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Liveness ───────────────────────────────────────────────────────────────────

@app.post("/liveness/start", response_model=StartSessionResponse)
def start_liveness_session(req: StartSessionRequest):
    """
    Called by React Native when user taps 'Mark Attendance'.
    Returns a session_id and the list of challenges to display.
    """
    session_id, processor = session_store.create(
        person_id=req.person_id,
        num_challenges=req.num_challenges,
    )
    state = processor.state
    return StartSessionResponse(
        session_id=session_id,
        challenges=state.challenges,
        first_prompt=state.current_message(),
        expires_in_seconds=30,
    )


@app.post("/liveness/frame", response_model=FrameResponse)
def push_frame(req: FrameRequest):
    """
    React Native sends one base64 JPEG frame at a time (~5 fps is enough).
    Returns updated liveness status. When passed=True, includes liveness_token.
    """
    entry = session_store.get(req.session_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    processor = entry["processor"]
    status = processor.process_b64_frame(req.frame_b64)

    # Issue signed token on pass, clean up session
    liveness_token = None
    if status["passed"]:
        liveness_token = issue_token(entry["person_id"])
        session_store.delete(req.session_id)
    elif status["failed"]:
        session_store.delete(req.session_id)

    return FrameResponse(**status, liveness_token=liveness_token)


# ── Sync ───────────────────────────────────────────────────────────────────────

@app.post("/sync/attendance", response_model=SyncResponse)
def sync_attendance(req: SyncRequest):
    """
    Called by the app when network is restored.
    Validates liveness tokens, batch-writes valid records to DynamoDB.
    """
    valid_records = []
    failed_ids = []

    for record in req.records:
        if record.liveness_token:
            ok, reason = verify_token(record.liveness_token, record.person_id)
            if not ok:
                failed_ids.append(record.id)
                continue
        valid_records.append(record)

    synced_count = 0
    if valid_records:
        synced_count, dynamo_failures = batch_write(valid_records)
        failed_ids.extend(dynamo_failures)

    return SyncResponse(
        success=len(failed_ids) == 0,
        synced_count=synced_count,
        failed_ids=failed_ids,
        server_timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/sync/purge-confirm")
def purge_confirm(req: PurgeConfirmation):
    """
    App calls this after it has wiped local SQLite records.
    We log it — useful for audit trail.
    """
    # In production: write to an audit log table in DynamoDB
    return {
        "acknowledged": True,
        "purged_count": len(req.purged_ids),
        "device_id": req.device_id,
    }


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        version="1.0.0",
        dynamo_reachable=health_check(),
        uptime_seconds=round(time.time() - _start_time, 1),
    )
