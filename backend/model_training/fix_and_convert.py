# fix_and_convert.py
# Fixes the dynamic shape issue then converts to TFLite

import onnx
from onnx import shape_inference
import numpy as np

print("Step 1: Fixing ONNX dynamic shape...")

# Load the model
model = onnx.load('face_recognition.onnx')

# Fix dynamic batch dimension to static 1
for input in model.graph.input:
    dim = input.type.tensor_type.shape.dim[0]
    dim.dim_value = 1  # Fix batch size to 1

for output in model.graph.output:
    dim = output.type.tensor_type.shape.dim[0]
    dim.dim_value = 1

# Run shape inference after fixing
model = shape_inference.infer_shapes(model)
onnx.save(model, 'face_recognition_fixed.onnx')
print("Fixed ONNX saved as face_recognition_fixed.onnx")

# Verify it
onnx.checker.check_model('face_recognition_fixed.onnx')
print("ONNX verification passed!")