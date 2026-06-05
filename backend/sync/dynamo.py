"""
sync/dynamo.py
B2 — DynamoDB wrapper for attendance record sync.

Table schema:
    PK  →  id          (String, UUID)
    SK  →  person_id   (String)
    GSI →  timestamp   (for date-range queries)
"""

import os
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from typing import List, Tuple
import logging

from models.schemas import AttendanceRecord

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
REGION     = os.environ.get("AWS_REGION", "ap-south-1")
TABLE_NAME = os.environ.get("DYNAMO_TABLE", "AttendanceLogs")

# ── Client (lazy init — safe for Lambda cold starts) ──────────────────────────
_dynamodb = None

def _get_table():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb", region_name=REGION)
    return _dynamodb.Table(TABLE_NAME)


# ── Write ──────────────────────────────────────────────────────────────────────
def batch_write(records: List[AttendanceRecord]) -> Tuple[int, List[str]]:
    """
    Writes records to DynamoDB in batches of 25 (AWS limit).
    Returns (success_count, failed_ids).
    """
    table = _get_table()
    synced = 0
    failed_ids: List[str] = []
    server_ts = datetime.now(timezone.utc).isoformat()

    # Split into chunks of 25
    for chunk_start in range(0, len(records), 25):
        chunk = records[chunk_start : chunk_start + 25]
        try:
            with table.batch_writer() as batch:
                for rec in chunk:
                    batch.put_item(Item={
                        "id":          rec.id,
                        "person_id":   rec.person_id,
                        "timestamp":   rec.timestamp,
                        "latitude":    str(rec.latitude),
                        "longitude":   str(rec.longitude),
                        "synced_at":   server_ts,
                        "device_synced": True,
                    })
            synced += len(chunk)
        except ClientError as e:
            logger.error("DynamoDB batch write failed: %s", e)
            failed_ids.extend(r.id for r in chunk)

    return synced, failed_ids


def health_check() -> bool:
    """Ping DynamoDB — used by /health endpoint."""
    try:
        table = _get_table()
        table.load()          # validates table exists & creds work
        return True
    except Exception:
        return False
