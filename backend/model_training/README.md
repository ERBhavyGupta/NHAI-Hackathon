\# B1 — Model Training \& Conversion



\## Files in this folder



| File | Purpose |

|------|---------|

| face\_recognition.onnx | Original InsightFace model |

| b1\_accuracy\_test.py | Accuracy benchmark script |

| b1\_lighting\_test.py | Lighting robustness test |

| b1\_final\_report.py | Final benchmark report |

| b1\_liveness\_module.py | Liveness detection logic |

| find\_threshold.py | Find best similarity threshold |



\## Model Details

\- Base model   : InsightFace buffalo\_sc

\- Format       : TFLite FP16 quantized

\- Size         : 6.55 MB

\- Input        : 1 x 3 x 112 x 112 float32

\- Output       : 1 x 512 float32 embedding

\- Threshold    : 0.35 cosine similarity

\- License      : Apache 2.0



\## TFLite Model Location

The final model for the app is at:

android/app/src/main/assets/models/face\_recognition\_FINAL.tflite



\## How to Run Benchmarks

1\. cd backend/model\_training

2\. python -m venv face\_env\_310

3\. face\_env\_310\\Scripts\\activate

4\. pip install onnxruntime opencv-python numpy

5\. python b1\_accuracy\_test.py

6\. python b1\_lighting\_test.py

7\. python b1\_final\_report.py

