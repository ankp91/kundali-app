import os, json
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, Header
from typing import Optional

# Initialise Firebase Admin SDK once
def _init():
    if firebase_admin._apps:
        return
    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    sa_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if sa_json:
        cred = credentials.Certificate(json.loads(sa_json))
    elif sa_path:
        cred = credentials.Certificate(sa_path)
    else:
        raise RuntimeError('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.')
    firebase_admin.initialize_app(cred)

_init()
_db = firestore.client()


def verify_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims."""
    try:
        return auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid or expired token')


def get_user_tier(uid: str) -> str:
    """Return the user's subscription tier from Firestore."""
    ref  = _db.collection('users').document(uid)
    snap = ref.get()
    if not snap.exists:
        return 'free'
    return snap.to_dict().get('tier', 'free')


def get_or_create_user(uid: str, email: str) -> dict:
    """Get user doc from Firestore, creating it if it doesn't exist."""
    ref  = _db.collection('users').document(uid)
    snap = ref.get()
    if not snap.exists:
        data = {'email': email, 'tier': 'free', 'usage': {'month': '', 'count': 0}}
        ref.set(data)
        return data
    return snap.to_dict()


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency — extracts + verifies Bearer token, returns claims."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authorization header required')
    token  = authorization.split(' ', 1)[1]
    claims = verify_token(token)
    return claims


async def optional_auth(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Like require_auth but returns None instead of raising if no token."""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    try:
        token = authorization.split(' ', 1)[1]
        return verify_token(token)
    except Exception:
        return None
