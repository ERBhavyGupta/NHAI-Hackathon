import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
attendance_table = dynamodb.Table('AttendanceLogs')
users_table      = dynamodb.Table('Users')

def lambda_handler(event, context):
    path   = event.get('rawPath', '')
    method = event.get('requestContext', {}).get('http', {}).get('method', '')

    headers = {
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type'                : 'application/json'
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))

        # ── Login ──────────────────────────────────────
        if path == '/sync/login':
            employee_id = body.get('employee_id')
            password    = body.get('password')

            if not employee_id:
                return {
                    'statusCode': 400,
                    'headers'   : headers,
                    'body'      : json.dumps({'error': 'employee_id required'})
                }

            return {
                'statusCode': 200,
                'headers'   : headers,
                'body'      : json.dumps({
                    'success'    : True,
                    'token'      : str(uuid.uuid4()),
                    'employee_id': employee_id,
                    'message'    : 'Login successful'
                })
            }

        # ── Register ───────────────────────────────────────────
        elif path == '/sync/register':
            name        = body.get('name', '')
            employee_id = body.get('employee_id', '')
            embedding   = body.get('embedding', [])
            user_id     = str(uuid.uuid4())
            token       = str(uuid.uuid4())

            users_table.put_item(Item={
                'id'           : user_id,
                'name'         : name,
                'employee_id'  : employee_id,
                'embedding'    : json.dumps(embedding),
                'registered_at': datetime.utcnow().isoformat()
            })

            return {
                'statusCode': 200,
                'headers'   : headers,
                'body'      : json.dumps({
                    'success': True,
                    'message': 'User created',
                    'userId' : user_id,
                    'token'  : token,
                    'name'   : name
                })
            }

        # ── Upload capture ─────────────────────────────
        elif path == '/sync/captures/upload':
            records = body.get('records', [body])

            with attendance_table.batch_writer() as batch:
                for record in records:
                    batch.put_item(Item={
                        'id'          : str(uuid.uuid4()),
                        'person_id'   : record.get('person_id', ''),
                        'person_name' : record.get('person_name', ''),
                        'employee_id' : record.get('employee_id', ''),
                        'timestamp'   : record.get('timestamp', datetime.utcnow().isoformat()),
                        'latitude'    : str(record.get('latitude', 0)),
                        'longitude'   : str(record.get('longitude', 0)),
                        'synced_at'   : datetime.utcnow().isoformat()
                    })

            return {
                'statusCode': 200,
                'headers'   : headers,
                'body'      : json.dumps({
                    'success': True,
                    'message': 'Capture uploaded'
                })
            }

        # ── Sync attendance ────────────────────────────
        elif path == '/sync/captures/sync':
            records = body.get('records', [])

            if not records:
                return {
                    'statusCode': 400,
                    'headers'   : headers,
                    'body'      : json.dumps({'error': 'No records provided'})
                }

            with attendance_table.batch_writer() as batch:
                for record in records:
                    batch.put_item(Item={
                        'id'          : str(uuid.uuid4()),
                        'person_id'   : record.get('person_id', ''),
                        'person_name' : record.get('person_name', ''),
                        'employee_id' : record.get('employee_id', ''),
                        'timestamp'   : record.get('timestamp', ''),
                        'latitude'    : str(record.get('latitude', 0)),
                        'longitude'   : str(record.get('longitude', 0)),
                        'synced_at'   : datetime.utcnow().isoformat()
                    })

            return {
                'statusCode': 200,
                'headers'   : headers,
                'body'      : json.dumps({
                    'success'      : True,
                    'synced_count' : len(records)
                })
            }

        else:
            return {
                'statusCode': 404,
                'headers'   : headers,
                'body'      : json.dumps({'error': f'Route {path} not found'})
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers'   : headers,
            'body'      : json.dumps({'error': str(e)})
        }