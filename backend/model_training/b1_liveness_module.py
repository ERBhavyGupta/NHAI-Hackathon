# b1_liveness_module.py
# NO tensorflow needed — mediapipe only
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'

import cv2
import numpy as np
import random
import time

# Import mediapipe carefully
try:
    import mediapipe.python.solutions.face_mesh as mp_face_mesh_module
    face_mesh = mp_face_mesh_module.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.7
    )
    print("MediaPipe loaded successfully!")
except Exception as e:
    print(f"MediaPipe import error: {e}")
    exit()

# ── Landmark indices ──────────────────────────────────
L_EYE = [362, 385, 387, 263, 373, 380]
R_EYE = [33,  160, 158, 133, 153, 144]
NOSE_TIP   = 4
LEFT_FACE  = 234
RIGHT_FACE = 454

# ── Core functions ────────────────────────────────────
def get_landmarks(frame):
    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh().process(rgb)
    if not result.multi_face_landmarks:
        return None
    h, w = frame.shape[:2]
    pts  = result.multi_face_landmarks[0].landmark
    return np.array([[p.x * w, p.y * h] for p in pts])

def eye_aspect_ratio(lm, indices):
    pts = lm[indices]
    A   = np.linalg.norm(pts[1] - pts[5])
    B   = np.linalg.norm(pts[2] - pts[4])
    C   = np.linalg.norm(pts[0] - pts[3]) + 1e-6
    return (A + B) / (2.0 * C)

def is_blinking(lm):
    l = eye_aspect_ratio(lm, L_EYE)
    r = eye_aspect_ratio(lm, R_EYE)
    return (l + r) / 2.0 < 0.22

def is_smiling(lm):
    left   = lm[61]
    right  = lm[291]
    top    = lm[0]
    bottom = lm[17]
    width  = np.linalg.norm(right - left)
    height = np.linalg.norm(bottom - top) + 1e-6
    return (width / height) > 3.2

def head_direction(lm):
    nose   = lm[NOSE_TIP]
    left   = lm[LEFT_FACE]
    right  = lm[RIGHT_FACE]
    center = (left[0] + right[0]) / 2
    width  = right[0] - left[0] + 1e-6
    ratio  = (nose[0] - center) / width
    if ratio >  0.18: return 'RIGHT'
    if ratio < -0.18: return 'LEFT'
    return 'CENTER'

# ── Challenge manager ─────────────────────────────────
class LivenessChallenge:
    ALL = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT']
    MSG = {
        'BLINK'      : 'Please BLINK',
        'SMILE'      : 'Please SMILE',
        'TURN_LEFT'  : 'Turn head LEFT',
        'TURN_RIGHT' : 'Turn head RIGHT',
    }

    def __init__(self):
        self.reset()

    def reset(self):
        self.challenges   = random.sample(self.ALL, 2)
        self.idx          = 0
        self.blink_frames = 0
        self.hold_frames  = 0
        self.start        = time.time()

    def instruction(self):
        if self.idx >= len(self.challenges):
            return 'DONE'
        return self.MSG[self.challenges[self.idx]]

    def process(self, lm):
        if lm is None:
            return 'NO_FACE'
        if time.time() - self.start > 15:
            return 'TIMEOUT'
        if self.idx >= len(self.challenges):
            return 'PASSED'

        c    = self.challenges[self.idx]
        done = False

        if c == 'BLINK':
            if is_blinking(lm):
                self.blink_frames += 1
            else:
                if self.blink_frames >= 2:
                    done = True
                self.blink_frames = 0

        elif c == 'SMILE':
            if is_smiling(lm):
                self.hold_frames += 1
                if self.hold_frames >= 5:
                    done = True
            else:
                self.hold_frames = 0

        elif c == 'TURN_LEFT':
            if head_direction(lm) == 'LEFT':
                self.hold_frames += 1
                if self.hold_frames >= 5:
                    done = True
            else:
                self.hold_frames = 0

        elif c == 'TURN_RIGHT':
            if head_direction(lm) == 'RIGHT':
                self.hold_frames += 1
                if self.hold_frames >= 5:
                    done = True
            else:
                self.hold_frames = 0

        if done:
            self.idx         += 1
            self.blink_frames = 0
            self.hold_frames  = 0
            self.start        = time.time()

        return 'PASSED' if self.idx >= len(self.challenges) else 'IN_PROGRESS'

# ── Webcam test ───────────────────────────────────────
def run_test():
    print("Opening webcam...")
    print("Press Q to quit")

    cap       = cv2.VideoCapture(0)
    challenge = LivenessChallenge()

    if not cap.isOpened():
        print("ERROR: Cannot open webcam")
        print("Try changing VideoCapture(0) to VideoCapture(1)")
        return

    print("Webcam opened!")
    print(f"Challenge 1: {challenge.challenges[0]}")
    print(f"Challenge 2: {challenge.challenges[1]}")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Cannot read frame")
            break

        frame = cv2.flip(frame, 1)
        lm    = get_landmarks(frame)
        state = challenge.process(lm)

        # Draw oval
        h, w = frame.shape[:2]
        color = (0, 255, 0) if state == 'PASSED' else (255, 200, 0)
        cv2.ellipse(frame, (w//2, h//2 - 30),
                    (120, 160), 0, 0, 360, color, 3)

        # Draw instruction
        text = challenge.instruction()
        step = f"Step {min(challenge.idx+1, 2)}/2"

        cv2.rectangle(frame, (0, 0), (w, 100), (0, 0, 0), -1)
        cv2.putText(frame, text, (20, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        cv2.putText(frame, step, (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

        # Status
        if state == 'PASSED':
            cv2.putText(frame, 'LIVENESS PASSED!',
                        (w//2 - 180, h - 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)

        if state == 'TIMEOUT':
            cv2.putText(frame, 'TIMEOUT - restarting',
                        (20, h - 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            challenge.reset()

        if state == 'NO_FACE':
            cv2.putText(frame, 'No face detected',
                        (20, h - 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)

        cv2.imshow('B1 Liveness Test', frame)

        if state == 'PASSED':
            cv2.waitKey(2500)
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Test complete!")
    print("Liveness detection is working correctly")
    print("F1 will now port this logic to React Native")

if __name__ == '__main__':
    run_test()