"""
liveness/frame_processor.py
B2 — Headless frame processor for React Native bridge.

React Native sends base64-encoded JPEG frames one at a time.
This module decodes them, runs liveness checks, and returns
a JSON-serialisable status dict — no GUI, no blocking.

Usage (from FastAPI route or any Python caller):
    processor = FrameProcessor(num_challenges=2)
    result = processor.process_b64_frame(base64_jpeg_string)
"""

import base64
import time
from typing import Optional
import numpy as np
import cv2

from .detector import new_session, process_frame, ChallengeState


class FrameProcessor:
    """
    Stateful per-user session.
    One instance = one authentication attempt.
    """

    def __init__(self, num_challenges: int = 2):
        self.state: ChallengeState = new_session(num_challenges)
        self.frame_count: int = 0
        self.created_at: float = time.time()

    # ── Frame ingestion ────────────────────────────────────────────────────────
    def process_b64_frame(self, b64_jpeg: str) -> dict:
        """
        Accepts a base64-encoded JPEG string (from RN camera).
        Returns a status dict suitable for JSON response.
        """
        frame = self._decode(b64_jpeg)
        if frame is None:
            return self._status(error="Failed to decode frame")

        self.frame_count += 1
        self.state = process_frame(frame, self.state)
        return self._status()

    def process_raw_frame(self, frame: np.ndarray) -> dict:
        """Accept an already-decoded OpenCV BGR frame."""
        self.frame_count += 1
        self.state = process_frame(frame, self.state)
        return self._status()

    # ── Status builder ─────────────────────────────────────────────────────────
    def _status(self, error: Optional[str] = None) -> dict:
        s = self.state
        return {
            "session_active":       not (s.passed or s.failed),
            "passed":               s.passed,
            "failed":               s.failed,
            "fail_reason":          s.fail_reason if s.failed else None,
            "current_challenge":    (s.challenges[s.current_idx]
                                     if s.current_idx < len(s.challenges) else None),
            "prompt":               s.current_message(),
            "challenges_done":      s.current_idx,
            "challenges_total":     len(s.challenges),
            "frames_processed":     self.frame_count,
            "elapsed_seconds":      round(time.time() - self.created_at, 2),
            "error":                error,
        }

    # ── Helpers ────────────────────────────────────────────────────────────────
    @staticmethod
    def _decode(b64_jpeg: str) -> Optional[np.ndarray]:
        try:
            # Strip data-URI prefix if present: "data:image/jpeg;base64,..."
            if "," in b64_jpeg:
                b64_jpeg = b64_jpeg.split(",", 1)[1]
            raw = base64.b64decode(b64_jpeg)
            arr = np.frombuffer(raw, dtype=np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            return None
