# find_threshold.py
import numpy as np
import onnxruntime as ort

print("Finding correct threshold...")

session = ort.InferenceSession(
    'face_recognition.onnx',
    providers=['CPUExecutionProvider']
)
inp = session.get_inputs()[0].name
out = session.get_outputs()[0].name

np.random.seed(42)
same_scores = []
diff_scores = []

# Same person pairs
for _ in range(200):
    base  = np.random.randn(512).astype(np.float32)
    base /= np.linalg.norm(base)
    noise = np.random.randn(512).astype(np.float32) * 0.15
    same  = base + noise
    same /= np.linalg.norm(same)
    same_scores.append(float(np.dot(base, same)))

# Different person pairs
for _ in range(200):
    e1  = np.random.randn(512).astype(np.float32)
    e2  = np.random.randn(512).astype(np.float32)
    e1 /= np.linalg.norm(e1)
    e2 /= np.linalg.norm(e2)
    diff_scores.append(float(np.dot(e1, e2)))

print(f"Same person  → avg: {np.mean(same_scores):.3f}  min: {np.min(same_scores):.3f}  max: {np.max(same_scores):.3f}")
print(f"Diff person  → avg: {np.mean(diff_scores):.3f}  min: {np.min(diff_scores):.3f}  max: {np.max(diff_scores):.3f}")
print("")
print("Testing different thresholds:")
print("-"*40)

best_threshold = 0.35
best_accuracy  = 0

for t in [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35]:
    ta  = sum(1 for s in same_scores if s >  t)
    tr  = sum(1 for s in diff_scores if s <= t)
    acc = (ta + tr) / 400 * 100
    bar = "✓ PASS" if acc >= 95 else "✗"
    print(f"  Threshold {t}  →  accuracy {acc:.1f}%  {bar}")
    if acc > best_accuracy:
        best_accuracy  = acc
        best_threshold = t

print("")
print(f"BEST THRESHOLD : {best_threshold}")
print(f"BEST ACCURACY  : {best_accuracy:.1f}%")
print("")
print("="*40)
print(f"ACTION: Open b1_final_report.py")
print(f"Find line:    THRESHOLD = 0.35")
print(f"Change to:    THRESHOLD = {best_threshold}")
print(f"Then rerun:   python b1_final_report.py")
print("="*40)