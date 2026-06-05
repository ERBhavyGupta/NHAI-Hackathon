# export_to_onnx.py
# Exports the InsightFace model to ONNX format
# ONNX is the bridge between Python model and TFLite

import os
import shutil

# The model was downloaded to this location
model_dir = os.path.expanduser('~/.insightface/models/buffalo_sc/')
print(f"Looking for model in: {model_dir}")

# List what's in there
if os.path.exists(model_dir):
    files = os.listdir(model_dir)
    print(f"Files found: {files}")
else:
    print("ERROR: Model directory not found. Run download_model.py first!")
    exit()

# The face recognition model file
# buffalo_sc contains: det_500m.onnx and w600k_mbf.onnx
# w600k_mbf.onnx is the face RECOGNITION model (the one we need)
# det_500m.onnx is the face DETECTION model

rec_model = None
det_model = None

for f in files:
    if 'mbf' in f or 'rec' in f or 'w600k' in f:
        rec_model = os.path.join(model_dir, f)
        print(f"Face recognition model found: {f}")
    if 'det' in f or '500m' in f:
        det_model = os.path.join(model_dir, f)
        print(f"Face detection model found: {f}")

if rec_model is None:
    print("Looking for any .onnx file...")
    for f in files:
        if f.endswith('.onnx'):
            print(f"Found ONNX: {f}")
            rec_model = os.path.join(model_dir, f)

if rec_model is None:
    print("ERROR: Could not find recognition model file!")
    exit()

# Copy it to our working folder
shutil.copy(rec_model, 'face_recognition.onnx')
print("")
print(f"Copied recognition model to face_recognition.onnx")

# Check file size
size_mb = os.path.getsize('face_recognition.onnx') / 1024 / 1024
print(f"ONNX model size: {size_mb:.1f} MB")
print("")

# Verify ONNX model
import onnx
model = onnx.load('face_recognition.onnx')
onnx.checker.check_model(model)
print("ONNX model verified successfully!")

# Print model input/output info
print("\nModel inputs:")
for inp in model.graph.input:
    print(f"  {inp.name}: {[d.dim_value for d in inp.type.tensor_type.shape.dim]}")

print("Model outputs:")
for out in model.graph.output:
    print(f"  {out.name}: {[d.dim_value for d in out.type.tensor_type.shape.dim]}")