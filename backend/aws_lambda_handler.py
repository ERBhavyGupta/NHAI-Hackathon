"""
aws_lambda_handler.py
B2 — AWS Lambda entry point.

Uses Mangum to adapt FastAPI ↔ API Gateway / Lambda.
Deploy with:
  pip install mangum
  zip -r lambda.zip . && aws lambda update-function-code ...

Environment variables to set in Lambda console:
  DYNAMO_TABLE           = AttendanceLogs
  AWS_REGION             = ap-south-1
  LIVENESS_TOKEN_SECRET  = <strong-random-secret>
"""

from mangum import Mangum
from api.app import app

# Mangum wraps the ASGI app for Lambda
handler = Mangum(app, lifespan="off")
