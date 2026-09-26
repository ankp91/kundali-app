import anthropic
import base64
import json
import os
import io
from PIL import Image
try:
    from pypdf import PdfReader, PdfWriter
    _PYPDF_AVAILABLE = True
except ImportError:
    _PYPDF_AVAILABLE = False

_SUPPORTED_IMAGE_MIME = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
_MAX_PDF_PAGES = 5


def _truncate_pdf(pdf_bytes: bytes) -> bytes:
    if not _PYPDF_AVAILABLE:
        return pdf_bytes
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        if len(reader.pages) <= _MAX_PDF_PAGES:
            return pdf_bytes
        writer = PdfWriter()
        for i in range(min(_MAX_PDF_PAGES, len(reader.pages))):
            writer.add_page(reader.pages[i])
        buf = io.BytesIO()
        writer.write(buf)
        return buf.getvalue()
    except Exception:
        return pdf_bytes


def _normalize_image(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    if mime_type.lower() in _SUPPORTED_IMAGE_MIME:
        return image_bytes, mime_type
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=90)
        return buf.getvalue(), 'image/jpeg'
    except Exception:
        return image_bytes, 'image/jpeg'


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
    vision_api_key = os.environ.get("ANTHROPIC_VISION_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=vision_api_key)

    is_pdf = mime_type.lower() == 'application/pdf'

    if is_pdf:
        image_bytes = _truncate_pdf(image_bytes)
        b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        file_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
        }
    else:
        image_bytes, mime_type = _normalize_image(image_bytes, mime_type)
        b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        file_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": mime_type, "data": b64},
        }

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [file_block, {"type": "text", "text": PROMPT}],
            }]
        )
    except anthropic.AuthenticationError:
        raise ValueError(
            "Upload requires a personal Anthropic API key. "
            "Get a free key at console.anthropic.com and add it as ANTHROPIC_VISION_API_KEY."
        )
    except Exception as e:
        if "model" in str(e).lower() or "endpoint" in str(e).lower() or "bedrock" in str(e).lower():
            raise ValueError(
                "Upload requires a personal Anthropic API key. "
                "Get a free key at console.anthropic.com and add it as ANTHROPIC_VISION_API_KEY."
            )
        raise

    # Find the first TextBlock — Sonnet 5 may prepend ThinkingBlock(s)
    raw = None
    for block in message.content:
        btype = getattr(block, 'type', '')
        if btype == 'text':
            raw = getattr(block, 'text', None)
            if raw:
                break
    if not raw:
        block_summary = [(getattr(b, 'type', '?'), type(b).__name__) for b in message.content]
        raise ValueError(f"No text block in response. Blocks received: {block_summary}")
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
