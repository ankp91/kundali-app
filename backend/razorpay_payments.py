import os, hmac, hashlib
import razorpay
from datetime import datetime
from firebase_auth import _db

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_SECRET = os.getenv('RAZORPAY_SECRET', '')

PLAN_TO_TIER = {
    'plan_Tuj9xovrhpUgRb': 'basic',
    'plan_TukIwxfdbm3Tbd': 'pro',
    'plan_TukJbUTzSoHERD': 'basic',
    'plan_TukKRz7YTcgyvv': 'pro',
}

TIER_LIMITS = {'free': 2, 'basic': 20, 'pro': 999999}


def _client():
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_SECRET))


def create_subscription(plan_id: str, customer_email: str, uid: str, total_count: int = 12) -> dict:
    plan_period = 'yearly' if plan_id in ('plan_TukJbUTzSoHERD', 'plan_TukKRz7YTcgyvv') else 'monthly'
    count = 1 if plan_period == 'yearly' else total_count
    return _client().subscription.create({
        'plan_id': plan_id,
        'total_count': count,
        'notify_info': {'notify_email': customer_email},
        'notes': {'uid': uid, 'email': customer_email},
    })


def verify_webhook_signature(payload_body: bytes, signature: str) -> bool:
    expected = hmac.new(RAZORPAY_SECRET.encode(), payload_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def handle_webhook_event(event: str, payload: dict) -> None:
    """Update Firestore tier based on subscription events."""
    sub = payload.get('subscription', {}).get('entity', {})
    plan_id = sub.get('plan_id', '')
    uid = sub.get('notes', {}).get('uid', '')

    if not uid:
        return

    ref = _db.collection('users').document(uid)

    if event == 'subscription.activated':
        tier = PLAN_TO_TIER.get(plan_id, 'basic')
        ref.set({'tier': tier, 'subscription_id': sub.get('id', ''), 'plan_id': plan_id}, merge=True)

    elif event in ('subscription.cancelled', 'subscription.expired', 'subscription.completed'):
        ref.set({'tier': 'free'}, merge=True)


def check_and_increment_usage(uid: str) -> tuple[bool, dict]:
    """Check usage limit and increment. Returns (allowed, info_dict)."""
    ref = _db.collection('users').document(uid)
    snap = ref.get()
    user = snap.to_dict() if snap.exists else {}

    tier = user.get('tier', 'free')
    limit = TIER_LIMITS.get(tier, 2)

    month = datetime.now().strftime('%Y-%m')
    usage = user.get('usage', {})
    current_month = usage.get('month', '')
    count = usage.get('count', 0) if current_month == month else 0

    if tier != 'pro' and count >= limit:
        return False, {'tier': tier, 'count': count, 'limit': limit, 'month': month}

    ref.set({'usage': {'month': month, 'count': count + 1}}, merge=True)
    return True, {'tier': tier, 'count': count + 1, 'limit': limit, 'month': month}


def get_usage(uid: str) -> dict:
    ref = _db.collection('users').document(uid)
    snap = ref.get()
    user = snap.to_dict() if snap.exists else {}
    tier = user.get('tier', 'free')
    limit = TIER_LIMITS.get(tier, 2)
    month = datetime.now().strftime('%Y-%m')
    usage = user.get('usage', {})
    count = usage.get('count', 0) if usage.get('month') == month else 0
    return {'tier': tier, 'usage_count': count, 'limit': limit, 'month': month}
