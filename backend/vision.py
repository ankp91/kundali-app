import base64
import json
import os
import io
import anthropic
import pypdf
from PIL import Image

_SUPPORTED_MIME = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/heic', 'image/heif', 'application/pdf',
}


def _to_jpeg(image_bytes: bytes) -> tuple[bytes, str]:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=90)
        return buf.getvalue(), 'image/jpeg'
    except Exception:
        return image_bytes, 'image/jpeg'


def _truncate_pdf(data: bytes, max_pages: int = 3) -> bytes:
    try:
        reader = pypdf.PdfReader(io.BytesIO(data))
        if len(reader.pages) <= max_pages:
            return data
        writer = pypdf.PdfWriter()
        for page in reader.pages[:max_pages]:
            writer.add_page(page)
        buf = io.BytesIO()
        writer.write(buf)
        return buf.getvalue()
    except Exception:
        return data


PROMPT = """You are an expert Vedic astrologer. Analyze this kundali (birth chart).

Extract ALL visible information and return a JSON object with this exact structure:
{
  "ascendant": {"sign": "SignName", "sign_hindi": "HindiName", "sign_num": 0, "degree": 0.0, "longitude": 0.0},
  "planets": {
    "Sun":     {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Moon":    {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Mercury": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Venus":   {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Mars":    {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Jupiter": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Saturn":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Rahu":    {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Ketu":    {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false}
  },
  "houses": {
    "1":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "2":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "3":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "4":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "5":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "6":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "7":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "8":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "9":  {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "10": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "11": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "12": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []}
  },
  "source": "uploaded_image",
  "notes": "any observations about the chart"
}

If a value is unclear or not visible, use null. Return ONLY valid JSON, no other text."""


def parse_kundali_image(image_bytes: bytes, mime_type: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_VISION_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_VISION_API_KEY not configured")

    client = anthropic.Anthropic(
        api_key=api_key,
        base_url="https://api.anthropic.com",
        timeout=90.0,
    )
    mt = mime_type.lower()

    if mt not in _SUPPORTED_MIME:
        image_bytes, mt = _to_jpeg(image_bytes)

    if mt == "application/pdf":
        image_bytes = _truncate_pdf(image_bytes, max_pages=3)
        b64 = base64.b64encode(image_bytes).decode()
        content_block = {"type": "document", "source": {"type": "base64", "media_type": mt, "data": b64}}
        extra_headers = {"anthropic-beta": "pdfs-2024-09-25"}
    else:
        b64 = base64.b64encode(image_bytes).decode()
        content_block = {"type": "image", "source": {"type": "base64", "media_type": mt, "data": b64}}
        extra_headers = {}

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": [content_block, {"type": "text", "text": PROMPT}]}],
            extra_headers=extra_headers,
        )
    except Exception as e:
        raise ValueError(f"Vision API error: {e}")

    raw = next((b.text for b in response.content if getattr(b, "type", "") == "text"), "").strip()
    if not raw:
        raise ValueError("No response from vision model — check image quality")

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
