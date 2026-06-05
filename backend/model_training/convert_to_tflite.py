# convert_to_tflite.py
# Converts ONNX model → TFLite with quantization
# Goal: get model under 20MB while keeping accuracy

import os
import numpy as np
import tensorflow as tf

print("="*50)
print("STEP 1: Convert ONNX to TF SavedModel")
print("="*50)

# Check ONNX file exists
if not os.path.exists('face_recognition.onnx'):
    print("ERROR: face_recognition.onnx not found!")
    print("Run export_to_onnx.py first!")
    exit()

# Convert using onnx2tf
import onnx2tf

print("Converting ONNX to TF format...")
print("This will take 2-5 minutes, please wait...")

try:
    onnx2tf.convert(
        input_onnx_file_path='face_recognition.onnx',
        output_folder_path='tf_saved_model',
        non_verbose=False,
        output_signaturedefs=True,
        batch_size=1,
    )
    print("Conversion successful!")
except Exception as e:
    print(f"Conversion error: {e}")
    print("Trying alternative method...")
    
    # Alternative: use tf2onnx in reverse
    import subprocess
    subprocess.run([
        'python', '-m', 'onnx2tf',
        '-i', 'face_recognition.onnx',
        '-o', 'tf_saved_model'
    ])

print("")
print("="*50)
print("STEP 2: Convert TF SavedModel to TFLite")
print("="*50)

# Load the TF saved model
converter = tf.lite.TFLiteConverter.from_saved_model('tf_saved_model')

# Apply optimizations
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# Representative dataset for quantization calibration
# This helps the model understand typical input ranges
def representative_dataset():
    print("Calibrating quantization...")
    for i in range(200):
        # Generate realistic face-sized input
        # Shape: (1, 3, 112, 112) = batch, channels, height, width
        dummy_face = np.random.uniform(-1, 1, (1, 3, 112, 112)).astype(np.float32)
        yield [dummy_face]

converter.representative_dataset = representative_dataset

# FP16 quantization - good balance of size vs accuracy
converter.target_spec.supported_types = [tf.float16]

print("Converting to TFLite FP16 (better accuracy)...")
try:
    tflite_model = converter.convert()
    
    with open('face_recognition_fp16.tflite', 'wb') as f:
        f.write(tflite_model)
    
    size = len(tflite_model) / 1024 / 1024
    print(f"FP16 model size: {size:.2f} MB")
    
except Exception as e:
    print(f"FP16 failed: {e}, trying default optimization...")
    
    converter2 = tf.lite.TFLiteConverter.from_saved_model('tf_saved_model')
    converter2.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter2.convert()
    
    with open('face_recognition_fp16.tflite', 'wb') as f:
        f.write(tflite_model)
    
    size = len(tflite_model) / 1024 / 1024
    print(f"Default optimized model size: {size:.2f} MB")

print("")
print("="*50)
print("STEP 3: Further compress with INT8 quantization")
print("="*50)

converter3 = tf.lite.TFLiteConverter.from_saved_model('tf_saved_model')
converter3.optimizations = [tf.lite.Optimize.DEFAULT]
converter3.representative_dataset = representative_dataset
converter3.target_spec.supported_ops = [
    tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
    tf.lite.OpsSet.TFLITE_BUILTINS
]

try:
    tflite_int8 = converter3.convert()
    
    with open('face_recognition_int8.tflite', 'wb') as f:
        f.write(tflite_int8)
    
    size_int8 = len(tflite_int8) / 1024 / 1024
    print(f"INT8 model size: {size_int8:.2f} MB")
    
except Exception as e:
    print(f"INT8 quantization failed: {e}")
    print("Will use FP16 model instead")

print("")
print("="*50)
print("FINAL RESULTS")
print("="*50)

models = {
    'face_recognition_fp16.tflite': 'FP16 (Recommended)',
    'face_recognition_int8.tflite': 'INT8 (Smallest)',
}

best_model = None
best_size = float('inf')

for filename, label in models.items():
    if os.path.exists(filename):
        size = os.path.getsize(filename) / 1024 / 1024
        print(f"{label}: {size:.2f} MB")
        if size < best_size:
            best_size = size
            best_model = filename

print("")
if best_model:
    import shutil
    shutil.copy(best_model, 'face_recognition_FINAL.tflite')
    print(f"BEST MODEL: {best_model} ({best_size:.2f} MB)")
    print(f"Saved as: face_recognition_FINAL.tflite")
    
    if best_size <= 20:
        print(f"SIZE CHECK: PASSED ({best_size:.2f} MB < 20 MB)")
    else:
        print(f"SIZE CHECK: FAILED ({best_size:.2f} MB > 20 MB)")
        print("Need more compression - contact team")
else:
    print("No model produced. Check errors above.")