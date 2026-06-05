# How to Test & Verify NHAI Hackathon 7.0 Integration

## 🧪 Testing Methods

### Option 1: Quick Local Testing (Recommended First Step)

#### Backend Testing (No AWS needed)

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run pytest (all tests, no AWS credentials needed)
pytest tests/ -v

# Expected output:
# tests/test_liveness.py::test_mediapipe_detector PASSED
# tests/test_liveness.py::test_frame_processor PASSED
# tests/test_liveness.py::test_token_roundtrip PASSED
# tests/test_sync_api.py::test_sync_endpoint PASSED
```

#### Frontend Testing

```bash
# 1. Navigate to root
cd /Users/snehaghadge/Downloads/NHAI-Hackathon-main

# 2. Install dependencies
npm install

# 3. Start Expo (choose your platform)
expo start

# Then press:
# 'a' for Android
# 'i' for iOS
# 'w' for Web
```

---

### Option 2: Local Backend Server Testing

#### Start Backend Server

```bash
cd backend
source .venv/bin/activate
uvicorn api.app:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### Test Endpoints with curl

**1. Health Check:**
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime_seconds": 2.5,
  "timestamp": "2026-06-05T10:30:00Z"
}
```

**2. Start Liveness Session:**
```bash
curl -X POST http://localhost:8000/liveness/start \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "person_id": "PERSON_123"
  }'
```

Expected response:
```json
{
  "session_id": "sess_abc123...",
  "challenges": [
    {"type": "blink", "duration_ms": 2000},
    {"type": "smile", "duration_ms": 2000},
    {"type": "turn_left", "duration_ms": 2000}
  ],
  "token": "hmac_signed_token_..."
}
```

**3. Submit Frame (Base64 encoded image):**
```bash
# First, create a test image and encode it
python3 << 'EOF'
import base64
from PIL import Image
import io

# Create a simple test image
img = Image.new('RGB', (640, 480), color=(73, 109, 137))
buf = io.BytesIO()
img.save(buf, format='JPEG')
b64 = base64.b64encode(buf.getvalue()).decode()
print(f"Base64 image: {b64[:50]}...")  # Print first 50 chars
EOF
```

Then submit:
```bash
curl -X POST http://localhost:8000/liveness/frame \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_abc123...",
    "frame_b64": "YOUR_BASE64_HERE",
    "challenge_idx": 0
  }'
```

---

### Option 3: Frontend Integration Testing

#### Test Login Flow

1. **Start Expo:**
   ```bash
   expo start --web  # Use web for quick testing
   ```

2. **Test Credentials:**
   - Navigate to Login screen


3. **Verify API Connection:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Attempt login
   - Check if request goes to AWS API Gateway:
     ```
     https://0vy4wgl8gk.execute-api.ap-south-1.amazonaws.com/sync/login
     ```

#### Test Offline Queue

1. **Open DevTools Console:**
   ```bash
   # Check queue storage
   const queue = require('./src/services/queue.js');
   queue.getQueue().then(q => console.log(q));
   ```

2. **Add to Queue:**
   ```javascript
   const queue = require('./src/services/queue.js');
   queue.addToQueue({
     personId: 'PERSON_123',
     employeeId: 'EMP001',
     name: 'Test User',
     liveness: 'passed',
     imagePath: '/path/to/image'
   }).then(entry => console.log('Added:', entry));
   ```

3. **Verify UUID Generation:**
   ```javascript
   // Check that IDs are UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
   queue.getQueue().then(q => {
     q.forEach(item => console.log(item.id));
   });
   ```

---

### Option 4: Full End-to-End Test (With Real AWS)

#### Prerequisites
```bash
# Set AWS credentials
export AWS_REGION=ap-south-1
export DYNAMO_TABLE=AttendanceLogs
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

#### Complete Flow
1. **Start Backend:**
   ```bash
   cd backend && uvicorn api.app:app --port 8000
   ```

2. **Start Frontend:**
   ```bash
   expo start --android
   ```

3. **Test Complete Journey:**
   - Register new user
   - Login
   - Capture liveness detection
   - Sync to DynamoDB
   - Verify attendance records in AWS Console

---

## ✅ Verification Checklist

### Backend
- [ ] Tests pass: `pytest tests/ -v`
- [ ] Server starts: `uvicorn api.app:app --reload`
- [ ] Health endpoint responds
- [ ] Liveness session creation works
- [ ] Frame processing works
- [ ] Token validation works

### Frontend
- [ ] Dependencies install: `npm install`
- [ ] Expo starts: `expo start`
- [ ] Login screen renders
- [ ] API calls to AWS Gateway
- [ ] Queue system generates UUIDs
- [ ] AsyncStorage persists data

### Integration
- [ ] Frontend → Backend API communication works
- [ ] Backend → DynamoDB writes records
- [ ] Offline queue syncs when online
- [ ] Attendance logs appear in DynamoDB

### Database
- [ ] DynamoDB table exists: `AttendanceLogs`
- [ ] Records have proper schema (id, person_id, timestamp)
- [ ] Date-range queries work via GSI

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Reinstall dependencies
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend API Calls Fail
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check AWS credentials are set
echo $AWS_REGION
echo $DYNAMO_TABLE

# Check network interceptor in api.js is working
# Look for Authorization header in DevTools
```

### UUID Not Generating
```bash
# Verify imports are correct in queue.js
grep -n "import.*uuid" src/services/queue.js
grep -n "react-native-get-random-values" src/services/queue.js

# Reinstall dependencies
npm install
```

### DynamoDB Writes Fail
```bash
# Test AWS credentials
aws dynamodb list-tables --region ap-south-1

# Check table name
aws dynamodb describe-table --table-name AttendanceLogs --region ap-south-1

# Check IAM permissions for:
# - dynamodb:BatchWriteItem
# - dynamodb:PutItem
```

---

## 📊 What to Look For

### Successful Backend Response
```json
{
  "status": "success",
  "data": {
    "session_id": "sess_...",
    "token": "hmac_...",
    "timestamp": "2026-06-05T10:30:00Z"
  }
}
```

### Successful Frontend Storage
```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // UUID format ✅
  personId: "PERSON_123",
  employeeId: "EMP001",
  name: "Test User",
  timestamp: "2026-06-05T10:30:00Z",
  liveness: "passed",
  imagePath: "/path",
  syncStatus: "pending"
}
```

### Successful DynamoDB Entry
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "person_id": "PERSON_123",
  "employee_id": "EMP001",
  "name": "Test User",
  "timestamp": "2026-06-05T10:30:00Z",
  "liveness": "passed",
  "server_timestamp": "2026-06-05T10:30:05Z"
}
```

---

## 🚀 Recommended Test Order

1. **Start here:** Backend pytest
   ```bash
   cd backend && pytest tests/ -v
   ```

2. **Then:** Backend server + health check
   ```bash
   uvicorn api.app:app --reload
   curl http://localhost:8000/health
   ```

3. **Then:** Frontend dependencies + Expo
   ```bash
   npm install
   expo start --web
   ```

4. **Finally:** Full integration with AWS
   - Set AWS credentials
   - Test complete flow

---

**Good luck! 🎉 Your system is ready to test!**
