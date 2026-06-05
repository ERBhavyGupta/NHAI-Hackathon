# download_model.py
# This downloads a pretrained face recognition model
# We do NOT train from scratch — no time for that
# InsightFace gives us a model already at 99%+ accuracy

import insightface
from insightface.app import FaceAnalysis
import os
import cv2
import numpy as np

print("Downloading model... this may take 2-5 minutes first time")
print("Model will be saved to C:\\Users\\YourName\\.insightface\\models\\")
print("")

# buffalo_sc is the smallest + fastest InsightFace model
# sc = small + compact
app = FaceAnalysis(
    name='buffalo_sc',
    providers=['CPUExecutionProvider']  # Use CPU, no GPU needed
)

# prepare() downloads the model if not already downloaded
app.prepare(ctx_id=-1, det_size=(640, 640))

print("Model downloaded successfully!")
print("")

# Now test it with a fake image to confirm it works
print("Testing model with a sample image...")

# Create a dummy face-like image for testing
dummy_img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

# Try to detect faces (will find nothing in random image, that is fine)
faces = app.get(dummy_img)
print(f"Test complete. Detected {len(faces)} faces in random image (expected 0)")
print("")
print("SUCCESS: Model is ready to use!")