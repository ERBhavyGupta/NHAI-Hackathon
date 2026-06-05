"""
tests/test_liveness.py
B2 — Unit tests for liveness logic (no webcam required).

Run:  pytest tests/ -v
"""

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

from liveness.detector import (
    _ear, check_blink, check_smile, check_head_turn,
    new_session, process_frame, ChallengeState,
    L_EYE, R_EYE, MOUTH_CORNERS, NOSE_TIP, FACE_LEFT, FACE_RIGHT,
)
from liveness.frame_processor import FrameProcessor


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_landmarks(n: int = 478) -> np.ndarray:
    """Return zeroed landmark array."""
    return np.zeros((n, 2))


def _open_eye_lm() -> np.ndarray:
    lm = _make_landmarks()
    for idx_list in [L_EYE, R_EYE]:
        lm[idx_list[0]] = [0,  0]
        lm[idx_list[1]] = [10, 10]
        lm[idx_list[2]] = [30, 10]
        lm[idx_list[3]] = [40, 0]
        lm[idx_list[4]] = [30, 0]
        lm[idx_list[5]] = [10, 0]
    return lm


def _closed_eye_lm() -> np.ndarray:
    lm = _make_landmarks()
    # A=1, B=1, C=20 → EAR=0.05
    for idx_list in [L_EYE, R_EYE]:
        lm[idx_list[0]] = [0, 0]
        lm[idx_list[1]] = [5, 1]
        lm[idx_list[2]] = [10, 1]
        lm[idx_list[3]] = [20, 0]
        lm[idx_list[4]] = [10, -1]
        lm[idx_list[5]] = [5, -1]
    return lm


def _smile_lm() -> np.ndarray:
    lm = _make_landmarks()
    # mouth width=100, height=10 → ratio=10 > 3.2
    lm[MOUTH_CORNERS[0]] = [0, 50]
    lm[MOUTH_CORNERS[1]] = [100, 50]
    lm[0] = [50, 45]    # top
    lm[17] = [50, 55]   # bot
    return lm


def _neutral_mouth_lm() -> np.ndarray:
    lm = _make_landmarks()
    # width=20, height=20 → ratio=1 < 3.2
    lm[MOUTH_CORNERS[0]] = [40, 50]
    lm[MOUTH_CORNERS[1]] = [60, 50]
    lm[0] = [50, 40]
    lm[17] = [50, 60]
    return lm


def _head_turn_lm(direction: str) -> np.ndarray:
    lm = _make_landmarks()
    lm[FACE_LEFT]  = [100, 50]
    lm[FACE_RIGHT] = [200, 50]
    center = 150
    width  = 100
    if direction == "LEFT":
        # nose left of centre by > 18 %
        lm[NOSE_TIP] = [center - 25, 50]   # ratio = -0.25
    elif direction == "RIGHT":
        lm[NOSE_TIP] = [center + 25, 50]   # ratio = +0.25
    else:
        lm[NOSE_TIP] = [center, 50]        # ratio = 0
    return lm


# ── EAR tests ──────────────────────────────────────────────────────────────────

def test_ear_open():
    lm = _open_eye_lm()
    val = _ear(lm[L_EYE])
    assert val > 0.22


def test_ear_closed():
    lm = _closed_eye_lm()
    val = _ear(lm[L_EYE])
    assert val < 0.22


# ── Blink tests ────────────────────────────────────────────────────────────────

def test_check_blink_open_eyes():
    assert check_blink(_open_eye_lm()) == False


def test_check_blink_closed_eyes():
    assert check_blink(_closed_eye_lm()) == True


# ── Smile tests ────────────────────────────────────────────────────────────────

def test_check_smile_smiling():
    assert check_smile(_smile_lm()) == True


def test_check_smile_neutral():
    assert check_smile(_neutral_mouth_lm()) == False


# ── Head turn tests ────────────────────────────────────────────────────────────

def test_head_turn_left():
    assert check_head_turn(_head_turn_lm("LEFT")) == "LEFT"


def test_head_turn_right():
    assert check_head_turn(_head_turn_lm("RIGHT")) == "RIGHT"


def test_head_turn_centre():
    assert check_head_turn(_head_turn_lm("CENTER")) == "CENTER"


# ── Session / state machine ────────────────────────────────────────────────────

def test_new_session_creates_challenges():
    state = new_session(2)
    assert len(state.challenges) == 2
    assert all(c in ["BLINK", "SMILE", "TURN_LEFT", "TURN_RIGHT"]
               for c in state.challenges)


def test_state_machine_blink_challenge():
    state = ChallengeState(challenges=["BLINK"])
    # Simulate closed eyes for 2 consecutive frames, then open
    closed_lm = _closed_eye_lm()
    open_lm   = _open_eye_lm()

    # Need a frame with face landmarks — patch get_landmarks
    with patch("liveness.detector.get_landmarks") as mock_lm:
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)

        # Frame 1: eyes closed
        mock_lm.return_value = closed_lm
        state = process_frame(mock_frame, state)
        assert state.blink_frames >= 1
        assert not state.passed

        # Frame 2: eyes closed again
        state = process_frame(mock_frame, state)
        assert state.blink_frames >= 2

        # Frame 3: eyes open — triggers detection
        mock_lm.return_value = open_lm
        state = process_frame(mock_frame, state)
        assert state.passed


def test_state_machine_smile_challenge():
    state = ChallengeState(challenges=["SMILE"])
    with patch("liveness.detector.get_landmarks") as mock_lm:
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_lm.return_value = _smile_lm()
        state = process_frame(mock_frame, state)
        assert state.passed


def test_state_machine_timeout():
    import time
    state = ChallengeState(challenges=["BLINK"])
    state.challenge_start = time.time() - 100   # already timed out
    with patch("liveness.detector.get_landmarks") as mock_lm:
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_lm.return_value = _open_eye_lm()
        state = process_frame(mock_frame, state)
        assert state.failed
        assert "Timeout" in state.fail_reason


# ── FrameProcessor ─────────────────────────────────────────────────────────────

def test_frame_processor_bad_b64():
    proc = FrameProcessor(num_challenges=1)
    result = proc.process_b64_frame("not-valid-base64!!!")
    assert result["error"] is not None


def test_frame_processor_returns_status_keys():
    proc = FrameProcessor(num_challenges=1)
    expected_keys = {
        "session_active", "passed", "failed", "fail_reason",
        "current_challenge", "prompt", "challenges_done",
        "challenges_total", "frames_processed", "elapsed_seconds", "error",
    }
    # Pass a tiny but valid JPEG (1x1 white pixel)
    import base64, io
    from PIL import Image
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    result = proc.process_b64_frame(b64)
    assert expected_keys.issubset(result.keys())


# ── Token tests ────────────────────────────────────────────────────────────────

def test_token_roundtrip():
    from utils.tokens import issue_token, verify_token
    token = issue_token("EMP001")
    valid, reason = verify_token(token, "EMP001")
    assert valid is True
    assert reason == "ok"


def test_token_wrong_person():
    from utils.tokens import issue_token, verify_token
    token = issue_token("EMP001")
    valid, reason = verify_token(token, "EMP999")
    assert valid is False


def test_token_expired():
    import time
    from utils.tokens import issue_token, verify_token, TOKEN_TTL
    token = issue_token("EMP001")
    with patch("utils.tokens.time") as mock_time:
        mock_time.time.return_value = time.time() + TOKEN_TTL + 10
        valid, reason = verify_token(token, "EMP001")
        assert valid is False
        assert "expired" in reason
