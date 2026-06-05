import requests
from datetime import datetime

BASE = "https://0vy4wgl8gk.execute-api.ap-south-1.amazonaws.com"

# Test login
r = requests.post(f"{BASE}/sync/login", json={"employee_id": "NHAI001"})
print(f"Login: {r.status_code} {r.json()}")

# Test register
r = requests.post(f"{BASE}/sync/register", json={"name": "Rahul", "employee_id": "NHAI001", "embedding": []})
print(f"Register: {r.status_code} {r.json()}")

# Test upload
r = requests.post(f"{BASE}/sync/captures/upload", json={"person_id": "EMP001", "timestamp": datetime.utcnow().isoformat()})
print(f"Upload: {r.status_code} {r.json()}")

# Test sync
r = requests.post(f"{BASE}/sync/captures/sync", json={"records": [{"person_id": "EMP001", "timestamp": datetime.utcnow().isoformat()}]})
print(f"Sync: {r.status_code} {r.json()}")