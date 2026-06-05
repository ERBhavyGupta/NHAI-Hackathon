# B2 Backend — Liveness + AWS Sync

Hackathon 7.0 · Datalake 3.0 Face Auth  
**Owner: Backend Dev 2 (B2)**

---

## What this does

| Layer | File | Purpose |
|---|---|---|
| Liveness core | `liveness/detector.py` | EAR blink, smile ratio, head-turn via MediaPipe |
| Headless processor | `liveness/frame_processor.py` | Accepts base64 JPEG from React Native, no GUI |
| API | `api/app.py` | FastAPI — 5 routes |
| DynamoDB | `sync/dynamo.py` | Batch write, 25-item chunks, error isolation |
| Tokens | `utils/tokens.py` | HMAC-signed liveness proof, 5-min TTL |
| Lambda | `aws_lambda_handler.py` | Mangum wraps FastAPI for API Gateway |

---

## Local dev setup

```bash
# 1. Create venv
python3 -m venv .venv && source .venv/bin/activate

# 2. Install deps
pip install -r requirements.txt

# 3. Run server
uvicorn api.app:app --reload --port 8000

# 4. Test webcam liveness (optional)
python -m liveness.detector
```

## Run tests (no AWS creds, no camera needed)

```bash
pytest tests/ -v
```

Expected: **12 tests pass**

---

## API Contract (share with F1/F2)

### 1. Start session
```
POST /liveness/start
{ "person_id": "EMP001", "num_challenges": 2 }

→ { "session_id": "abc123", "challenges": ["BLINK","SMILE"],
    "first_prompt": "Please BLINK your eyes", "expires_in_seconds": 30 }
```

### 2. Push frame (call at ~5 fps)
```
POST /liveness/frame
{ "session_id": "abc123", "frame_b64": "<base64-jpeg>" }

→ { "passed": false, "failed": false,
    "prompt": "Please SMILE", "challenges_done": 1, "challenges_total": 2,
    "liveness_token": null }        ← token appears only when passed=true
```

### 3. Sync attendance (call when network restored)
```
POST /sync/attendance
{
  "device_id": "DEVICE-XYZ",
  "records": [
    { "person_id": "EMP001", "timestamp": "2026-05-30T08:00:00",
      "latitude": 19.21, "longitude": 72.97, "liveness_token": "<token>" }
  ]
}

→ { "success": true, "synced_count": 1, "failed_ids": [], "server_timestamp": "..." }
```

### 4. Purge confirm (call after wiping local SQLite)
```
POST /sync/purge-confirm
{ "device_id": "DEVICE-XYZ", "purged_ids": ["id1","id2"], "purged_at": "..." }
```

### 5. Health
```
GET /health
→ { "status": "ok", "dynamo_reachable": true, "uptime_seconds": 42.1 }
```

---

## AWS Lambda deploy

```bash
# Package
pip install -r requirements.txt -t package/
cp -r liveness sync api models utils aws_lambda_handler.py package/
cd package && zip -r ../lambda.zip .

# Deploy (first time)
aws lambda create-function \
  --function-name datalake-faceauth \
  --runtime python3.11 \
  --handler aws_lambda_handler.handler \
  --zip-file fileb://../lambda.zip \
  --role arn:aws:iam::<account-id>:role/lambda-exec-role \
  --region ap-south-1

# Update
aws lambda update-function-code \
  --function-name datalake-faceauth \
  --zip-file fileb://lambda.zip

# Set env vars
aws lambda update-function-configuration \
  --function-name datalake-faceauth \
  --environment "Variables={
    DYNAMO_TABLE=AttendanceLogs,
    AWS_REGION=ap-south-1,
    LIVENESS_TOKEN_SECRET=<strong-secret>
  }"
```

### Required IAM permissions for Lambda role
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:BatchWriteItem",
    "dynamodb:DescribeTable"
  ],
  "Resource": "arn:aws:dynamodb:ap-south-1:*:table/AttendanceLogs"
}
```

### DynamoDB table (create once)
```bash
aws dynamodb create-table \
  --table-name AttendanceLogs \
  --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=person_id,AttributeType=S \
  --key-schema \
      AttributeName=id,KeyType=HASH \
      AttributeName=person_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

---

## Handoff to F1/F2 (Day 3)

F1 needs:
- `POST /liveness/start` → returns `session_id` + first `prompt`
- `POST /liveness/frame` → call at 5 fps with base64 JPEG, watch `passed` flag

F2 needs:
- `POST /sync/attendance` → call with stored records + `liveness_token` when network available
- `POST /sync/purge-confirm` → call after local DB wipe

Base URL (local dev): `http://localhost:8000`  
Base URL (prod): API Gateway URL from Lambda deploy output
