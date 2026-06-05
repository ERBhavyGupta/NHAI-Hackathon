# test_face_detection.py
# Test that the model can detect and recognize a real face

import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import os

# Load the model
app = FaceAnalysis(
    name='buffalo_sc',
    providers=['CPUExecutionProvider']
)
app.prepare(ctx_id=-1, det_size=(640, 640))

# Load your test image
img_path = 'test_face.jpg'

if not os.path.exists(img_path):
    print("ERROR: test_face.jpg not found!")
    print("Please put a photo named test_face.jpg in this folder")
    exit()

img = cv2.imread(img_path)
print(f"Image loaded: {img.shape}")

# Detect faces
faces = app.get(img)
print(f"Faces detected: {len(faces)}")

if len(faces) == 0:
    print("No face detected. Try a clearer photo with good lighting.")
    exit()

face = faces[0]

# Print face info
print(f"Face bounding box: {face.bbox}")
print(f"Detection confidence: {face.det_score:.2f}")
print(f"Embedding shape: {face.embedding.shape}")
print(f"Embedding sample values: {face.embedding[:5]}")
print("")
print("SUCCESS: Face detected and embedding generated!")

# Save a copy with face box drawn on it
result_img = img.copy()
box = face.bbox.astype(int)
cv2.rectangle(result_img, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
cv2.putText(result_img, f"Conf: {face.det_score:.2f}", 
            (box[0], box[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)

cv2.imwrite('test_result.jpg', result_img)
print("Result image saved as test_result.jpg - open it to see face box")