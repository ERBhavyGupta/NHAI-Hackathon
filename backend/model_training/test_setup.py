# test_setup.py
# Run this first to confirm everything works

import cv2
import numpy as np
import torch
import tensorflow as tf
import mediapipe as mp
import insightface

print("OpenCV:", cv2.__version__)
print("NumPy:", np.__version__)
print("PyTorch:", torch.__version__)
print("TensorFlow:", tf.__version__)
print("MediaPipe:", mp.__version__)
print("InsightFace:", insightface.__version__)
print("")
print("ALL PACKAGES OK - You are ready to start!")