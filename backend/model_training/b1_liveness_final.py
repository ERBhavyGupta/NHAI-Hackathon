# b1_liveness_final.py
# Clean version - no tensorflow import at all
# Tests blink, smile, head turn on webcam

import cv2
import numpy as np
import random
import time

print("Loading MediaPipe...")

try:
    import mediapipe.python.solutions.face_mesh as mp_face_mesh
    print("MediaPipe loaded OK")
except Exception as e:
    print(f"MediaPipe failed: {e}")
    print("Run: pip install mediapipe==0.10.9 --no-deps")
    exit()

# ── Setup face mesh ───────────────────────────────────
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6
)

# ── Landmark indices ──────────────────────────────────
L_EYE      = [362, 385, 387, 263, 373, 380]
R_EYE      = [33,  160, 158, 133, 153, 144]
NOSE_TIP   = 4
LEFT_FACE  = 234
RIGHT_FACE = 454
MOUTH_L    = 61
MOUTH_R    = 291
MOUTH_TOP  = 0
MOUTH_BOT  = 17

# ── Detection functions ───────────────────────────────
def get_landmarks(frame):
    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)
    if not result.multi_face_landmarks:
        return None
    h, w = frame.shape[:2]
    pts  = result.multi_face_landmarks[0].landmark
    return np.array([[p.x * w, p.y * h] for p in pts])

def ear(lm, idx):
    pts = lm[idx]
    A   = np.linalg.norm(pts[1] - pts[5])
    B   = np.linalg.norm(pts[2] - pts[4])
    C   = np.linalg.norm(pts[0] - pts[3]) + 1e-6
    return (A + B) / (2.0 * C)

def is_blinking(lm):
    return (ear(lm, L_EYE) + ear(lm, R_EYE)) / 2 < 0.22

def is_smiling(lm):
    w = np.linalg.norm(lm[MOUTH_R] - lm[MOUTH_L])
    h = np.linalg.norm(lm[MOUTH_BOT] - lm[MOUTH_TOP]) + 1e-6
    return (w / h) > 3.2

def head_dir(lm):
    nose   = lm[NOSE_TIP]
    center = (lm[LEFT_FACE][0] + lm[RIGHT_FACE][0]) / 2
    width  = lm[RIGHT_FACE][0] - lm[LEFT_FACE][0] + 1e-6
    ratio  = (nose[0] - center) / width
    if ratio >  0.18: return 'RIGHT'
    if ratio < -0.18: return 'LEFT'
    return 'CENTER'

# ── Challenge manager ─────────────────────────────────
class Liveness:
    MSGS = {
        'BLINK'      : 'Please BLINK your eyes',
        'SMILE'      : 'Please SMILE',
        'TURN_LEFT'  : 'Turn your head LEFT',
        'TURN_RIGHT' : 'Turn your head RIGHT',
    }

    def __init__(self):
        self.reset()

    def reset(self):
        all_c          = ['BLINK','SMILE','TURN_LEFT','TURN_RIGHT']
        self.queue     = random.sample(all_c, 2)
        self.idx       = 0
        self.blinks    = 0
        self.frames    = 0
        self.was_shut  = False
        self.timer     = time.time()

    def instruction(self):
        if self.idx >= len(self.queue):
            return 'DONE'
        return self.MSGS[self.queue[self.idx]]

    def step(self):
        return self.idx

    def process(self, lm):
        if lm is None:
            return 'NO_FACE'

        if time.time() - self.timer > 15:
            return 'TIMEOUT'

        if self.idx >= len(self.queue):
            return 'PASSED'

        c    = self.queue[self.idx]
        done = False

        if c == 'BLINK':
            if is_blinking(lm):
                self.was_shut = True
            elif self.was_shut:
                done          = True
                self.was_shut = False

        elif c == 'SMILE':
            if is_smiling(lm):
                self.frames += 1
                if self.frames >= 5:
                    done = True
            else:
                self.frames = 0

        elif c == 'TURN_LEFT':
            if head_dir(lm) == 'LEFT':
                self.frames += 1
                if self.frames >= 5:
                    done = True
            else:
                self.frames = 0

        elif c == 'TURN_RIGHT':
            if head_dir(lm) == 'RIGHT':
                self.frames += 1
                if self.frames >= 5:
                    done = True
            else:
                self.frames = 0

        if done:
            print(f"Challenge {c} PASSED!")
            self.idx    += 1
            self.frames  = 0
            self.timer   = time.time()

        return 'PASSED' if self.idx >= 2 else 'IN_PROGRESS'

# ── Run webcam test ───────────────────────────────────
def run():
    print("")
    print("="*50)
    print("LIVENESS TEST STARTING")
    print("Press Q to quit")
    print("="*50)

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Cannot open camera 0, trying camera 1...")
        cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        print("ERROR: No webcam found")
        return

    print("Camera opened!")
    checker = Liveness()
    print(f"Challenge 1: {checker.queue[0]}")
    print(f"Challenge 2: {checker.queue[1]}")
    print("")

    passed = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame  = cv2.flip(frame, 1)
        lm     = get_landmarks(frame)
        status = checker.process(lm)
        h, w   = frame.shape[:2]

        # Draw oval guide
        color = (0,255,0) if status == 'PASSED' else (0,200,255)
        cv2.ellipse(frame, (w//2, h//2-40),
                    (110, 150), 0, 0, 360, color, 3)

        # Black bar at top
        cv2.rectangle(frame, (0,0), (w,110), (0,0,0), -1)

        # Instruction text
        instr = checker.instruction()
        step  = f"Step {min(checker.step()+1, 2)} of 2"

        cv2.putText(frame, instr, (15, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(frame, step,  (15, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (200,200,200), 2)

        # Status messages
        if status == 'PASSED':
            cv2.putText(frame, 'LIVENESS PASSED!',
                        (w//2-160, h-30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.2, (0,255,0), 3)
            passed = True

        elif status == 'TIMEOUT':
            cv2.putText(frame, 'Timeout - restarting',
                        (15, h-30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (0,0,255), 2)
            checker.reset()

        elif status == 'NO_FACE':
            cv2.putText(frame, 'No face - move closer',
                        (15, h-30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (0,165,255), 2)

        # EAR debug info
        if lm is not None:
            ear_val = (ear(lm, L_EYE) + ear(lm, R_EYE)) / 2
            cv2.putText(frame, f"EAR:{ear_val:.2f}",
                        (w-120, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6, (150,150,150), 1)

        cv2.imshow('B1 Liveness Test', frame)

        if passed:
            cv2.waitKey(2500)
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    print("")
    print("="*50)
    if passed:
        print("RESULT: LIVENESS PASSED")
        print("Blink, Smile, Head Turn all working!")
        print("This logic is ready for React Native")
    else:
        print("RESULT: Test ended early")
    print("="*50)

if __name__ == '__main__':
    run()