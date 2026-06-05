"""
utils/session_store.py
B2 — Thread-safe in-memory session store with TTL expiry.

Liveness sessions are short-lived (30 s). We don't need Redis
for the hackathon — a plain dict with TTL checks is fine and
keeps the stack minimal (no extra infra).
"""

import time
import threading
import secrets
from typing import Optional, Dict
from liveness.frame_processor import FrameProcessor


SESSION_TTL = 30        # seconds — matches CHALLENGE_TIMEOUT_S * num_challenges
PURGE_INTERVAL = 60     # run cleanup every N seconds


class SessionStore:
    def __init__(self):
        self._store: Dict[str, dict] = {}
        self._lock = threading.Lock()
        self._start_cleanup_thread()

    # ── CRUD ───────────────────────────────────────────────────────────────────
    def create(self, person_id: str, num_challenges: int) -> tuple[str, FrameProcessor]:
        session_id = secrets.token_urlsafe(16)
        processor = FrameProcessor(num_challenges=num_challenges)
        with self._lock:
            self._store[session_id] = {
                "person_id": person_id,
                "processor": processor,
                "created_at": time.time(),
            }
        return session_id, processor

    def get(self, session_id: str) -> Optional[dict]:
        with self._lock:
            entry = self._store.get(session_id)
            if entry is None:
                return None
            if time.time() - entry["created_at"] > SESSION_TTL:
                del self._store[session_id]
                return None
            return entry

    def delete(self, session_id: str):
        with self._lock:
            self._store.pop(session_id, None)

    # ── Cleanup ────────────────────────────────────────────────────────────────
    def _purge_expired(self):
        now = time.time()
        with self._lock:
            expired = [sid for sid, e in self._store.items()
                       if now - e["created_at"] > SESSION_TTL]
            for sid in expired:
                del self._store[sid]

    def _start_cleanup_thread(self):
        def loop():
            while True:
                time.sleep(PURGE_INTERVAL)
                self._purge_expired()
        t = threading.Thread(target=loop, daemon=True)
        t.start()


# Singleton — import this everywhere
session_store = SessionStore()
