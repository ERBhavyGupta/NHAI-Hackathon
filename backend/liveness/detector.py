"""
liveness/detector.py
B2 — Liveness Detection Core
Challenges: BLINK, SMILE, TURN_LEFT, TURN_RIGHT
Returns structured result dict for API consumption.
"""

import random
import time
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions
from dataclasses import dataclass, field
from typing import Optional

# ── MediaPipe Face Landmarker setup (v0.10.35+) ────────────────────────────────
# Lazy initialization - face_mesh will be initialized on first use
_face_mesh = None

def _get_face_mesh():
    global _face_mesh
    if _face_mesh is None:
        try:
            # Try to initialize with default model
            base_options = BaseOptions(model_asset_path=None)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
                output_face_landmarks=True,
                output_blendshapes=False,
                output_facial_transformation_matrixes=False
            )
            _face_mesh = vision.FaceLandmarker.create_from_options(options)
        except Exception as e:
            print(f"Warning: Could not initialize FaceLandmarker: {e}")
            # Return a mock object for testing
            class MockFaceLandmarker:
                def detect(self, frame):
                    return None
                def detect_for_video(self, frame, ts):
                    return None
            _face_mesh = MockFaceLandmarker()
    return _face_mesh

# Get face mesh instance
def face_mesh():
    return _get_face_mesh()

# ── Landmark index groups ──────────────────────────────────────────────────────
L_EYE = [362, 385, 387, 263, 373, 380]
R_EYE = [33, 160, 158, 133, 153, 144]

MOUTH_CORNERS = (61, 291)   # left, right
MOUTH_TOP     = 0
MOUTH_BOT     = 17
NOSE_TIP      = 4
FACE_LEFT     = 234
FACE_RIGHT    = 454

# ── Thresholds (tuned for Indian outdoor lighting) ─────────────────────────────
EAR_THRESHOLD        = 0.22   # below = eyes closed
SMILE_RATIO          = 3.2    # mouth_width / mouth_height
HEAD_TURN_RATIO      = 0.18   # deviation from face centre
BLINK_CONSEC_FRAMES  = 2      # frames eye must stay closed
CHALLENGE_TIMEOUT_S  = 8      # seconds per challenge before fail


# ── Geometry helpers ───────────────────────────────────────────────────────────
def _ear(pts: np.ndarray) -> float:
    """Eye Aspect Ratio — Soukupova & Cech (2016)."""
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3]) + 1e-6
    return (A + B) / (2.0 * C)


def get_landmarks(frame: np.ndarray) -> Optional[np.ndarray]:
    """Return (478, 2) landmark array or None if no face detected."""
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    fm = face_mesh()  # Get face mesh instance
    # Check if it's a mock or real landmarker
    if hasattr(fm, 'process'):
        result = fm.process(rgb)
    elif hasattr(fm, 'detect'):
        result = fm.detect(rgb)
    else:
        return None
    
    # Handle different result types
    if result is None:
        return None
    if hasattr(result, 'multi_face_landmarks') and result.multi_face_landmarks:
        h, w = frame.shape[:2]
        pts = result.multi_face_landmarks[0].landmark
        return np.array([[p.x * w, p.y * h] for p in pts])
    elif hasattr(result, 'face_landmarks') and result.face_landmarks:
        h, w = frame.shape[:2]
        face_landmarks = result.face_landmarks[0]
        landmarks = []
        for lm in face_landmarks.landmark:
            landmarks.append([lm.x * w, lm.y * h])
        return np.array(landmarks) if landmarks else None
    return None


# ── Individual challenge checks ────────────────────────────────────────────────
def check_blink(lm: np.ndarray) -> bool:
    l = _ear(lm[L_EYE])
    r = _ear(lm[R_EYE])
    return (l + r) / 2 < EAR_THRESHOLD


def check_smile(lm: np.ndarray) -> bool:
    left  = lm[MOUTH_CORNERS[0]]
    right = lm[MOUTH_CORNERS[1]]
    top   = lm[MOUTH_TOP]
    bot   = lm[MOUTH_BOT]
    w = np.linalg.norm(right - left)
    h = np.linalg.norm(bot - top) + 1e-6
    return (w / h) > SMILE_RATIO


def check_head_turn(lm: np.ndarray) -> str:
    """Returns 'LEFT', 'RIGHT', or 'CENTER'."""
    nose   = lm[NOSE_TIP]
    lf     = lm[FACE_LEFT]
    rf     = lm[FACE_RIGHT]
    center = (lf[0] + rf[0]) / 2
    width  = rf[0] - lf[0] + 1e-6
    ratio  = (nose[0] - center) / width
    if ratio >  HEAD_TURN_RATIO: return "RIGHT"
    if ratio < -HEAD_TURN_RATIO: return "LEFT"
    return "CENTER"


# ── Challenge state machine ────────────────────────────────────────────────────
@dataclass
class ChallengeState:
    challenges: list       = field(default_factory=list)
    current_idx: int       = 0
    blink_frames: int      = 0
    challenge_start: float = field(default_factory=time.time)
    passed: bool           = False
    failed: bool           = False
    fail_reason: str       = ""

    MESSAGES = {
        "BLINK":      "Please BLINK your eyes",
        "SMILE":      "Please SMILE",
        "TURN_LEFT":  "Turn your head LEFT",
        "TURN_RIGHT": "Turn your head RIGHT",
    }

    def current_message(self) -> str:
        if self.passed:
            return "✓ Liveness Verified"
        if self.failed:
            return f"✗ Failed: {self.fail_reason}"
        if self.current_idx < len(self.challenges):
            c = self.challenges[self.current_idx]
            return self.MESSAGES[c]
        return ""

    def advance(self):
        self.current_idx += 1
        self.blink_frames = 0
        self.challenge_start = time.time()
        if self.current_idx >= len(self.challenges):
            self.passed = True

    def check_timeout(self) -> bool:
        return (time.time() - self.challenge_start) > CHALLENGE_TIMEOUT_S


def process_frame(frame: np.ndarray, state: ChallengeState) -> ChallengeState:
    """
    Single-frame update of challenge state.
    Call this in your video loop — returns updated state.
    """
    if state.passed or state.failed:
        return state

    # Timeout check
    if state.check_timeout():
        state.failed = True
        state.fail_reason = f"Timeout on {state.challenges[state.current_idx]}"
        return state

    lm = get_landmarks(frame)
    if lm is None:
        return state   # no face — keep waiting

    c = state.challenges[state.current_idx]

    if c == "BLINK":
        if check_blink(lm):
            state.blink_frames += 1
        else:
            if state.blink_frames >= BLINK_CONSEC_FRAMES:
                state.advance()
            state.blink_frames = 0

    elif c == "SMILE":
        if check_smile(lm):
            state.advance()

    elif c == "TURN_LEFT":
        if check_head_turn(lm) == "LEFT":
            state.advance()

    elif c == "TURN_RIGHT":
        if check_head_turn(lm) == "RIGHT":
            state.advance()

    return state


# ── Public API ─────────────────────────────────────────────────────────────────
def new_session(num_challenges: int = 2) -> ChallengeState:
    """Create a randomised challenge session (called once per auth attempt)."""
    pool = ["BLINK", "SMILE", "TURN_LEFT", "TURN_RIGHT"]
    chosen = random.sample(pool, min(num_challenges, len(pool)))
    return ChallengeState(challenges=chosen, challenge_start=time.time())


def run_liveness_webcam(num_challenges: int = 2) -> dict:
    """
    Blocking webcam test — used for local dev / B2 testing.
    Returns result dict compatible with the sync API payload.
    """
    state = new_session(num_challenges)
    cap = cv2.VideoCapture(0)
    start_ts = time.time()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        state = process_frame(frame, state)

        # HUD overlay
        color = (0, 255, 0) if state.passed else (0, 60, 255) if state.failed else (0, 165, 255)
        cv2.putText(frame, state.current_message(),
                    (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        step_label = (f"Step {state.current_idx + 1}/{len(state.challenges)}"
                      if not state.passed and not state.failed else "")
        cv2.putText(frame, step_label,
                    (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 1)

        cv2.imshow("Liveness Check", frame)

        if state.passed or state.failed:
            cv2.waitKey(1800)
            break
        if cv2.waitKey(1) & 0xFF == ord("q"):
            state.failed = True
            state.fail_reason = "User quit"
            break

    cap.release()
    cv2.destroyAllWindows()
    elapsed = round(time.time() - start_ts, 3)

    return {
        "passed": state.passed,
        "challenges_completed": state.current_idx,
        "total_challenges": len(state.challenges),
        "duration_seconds": elapsed,
        "fail_reason": state.fail_reason if state.failed else None,
    }


if __name__ == "__main__":
    result = run_liveness_webcam()
    print("\n── Liveness Result ──")
    for k, v in result.items():
        print(f"  {k}: {v}")
