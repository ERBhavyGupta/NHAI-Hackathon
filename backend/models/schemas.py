"""
models/schemas.py
B2 — All Pydantic v2 schemas for request validation & response serialisation.
"""

from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import uuid


# ── Liveness ──────────────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    person_id: str = Field(..., description="Employee / field personnel ID")
    num_challenges: int = Field(2, ge=1, le=4)


class StartSessionResponse(BaseModel):
    session_id: str
    challenges: List[str]
    first_prompt: str
    expires_in_seconds: int = 30


class FrameRequest(BaseModel):
    session_id: str
    frame_b64: str = Field(..., description="Base64-encoded JPEG from RN camera")


class FrameResponse(BaseModel):
    session_active: bool
    passed: bool
    failed: bool
    fail_reason: Optional[str]
    current_challenge: Optional[str]
    prompt: str
    challenges_done: int
    challenges_total: int
    frames_processed: int
    elapsed_seconds: float
    liveness_token: Optional[str] = None   # issued only when passed=True


# ── Attendance Records ─────────────────────────────────────────────────────────

class AttendanceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    timestamp: str                          # ISO-8601
    latitude: float = Field(0.0, ge=-90, le=90)
    longitude: float = Field(0.0, ge=-180, le=180)
    liveness_token: Optional[str] = None   # proves anti-spoof passed

    @field_validator("timestamp")
    @classmethod
    def validate_ts(cls, v: str) -> str:
        datetime.fromisoformat(v)           # raises ValueError if malformed
        return v


class SyncRequest(BaseModel):
    device_id: str
    records: List[AttendanceRecord] = Field(..., min_length=1, max_length=500)


class SyncResponse(BaseModel):
    success: bool
    synced_count: int
    failed_ids: List[str] = []
    server_timestamp: str


class PurgeConfirmation(BaseModel):
    device_id: str
    purged_ids: List[str]
    purged_at: str


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    dynamo_reachable: bool
    uptime_seconds: float
