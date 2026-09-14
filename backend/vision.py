import anthropic
import base64
import json
import os


def parse_kundali_image(image_bytes: bytes, mime_type: str) -> dict:
    client = anthropic.Anthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
        base_url=os.environ.get("ANTHROPIC_BASE_URL") or None,
    )

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = """You are an expert Vedic astrologer. Analyze this kundali (birth chart) image.

Extract ALL visible information and return a JSON object with this exact structure:
{
  "ascendant": {
    "sign": "SignName",
    "sign_hindi": "HindiName",
    "sign_num": 0,
    "degree": 0.0,
    "longitude": 0.0
  },
  "planets": {
    "Sun": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Moon": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Mercury": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Venus": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Mars": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Jupiter": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Saturn": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Rahu": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false},
    "Ketu": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "degree": 0.0, "house": 1, "longitude": 0.0, "nakshatra": "...", "pada": 1, "is_retrograde": false}
  },
  "houses": {
    "1": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": ["Sun"]},
    "2": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "3": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "4": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "5": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "6": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "7": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "8": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "9": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "10": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "11": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []},
    "12": {"sign": "...", "sign_hindi": "...", "sign_num": 0, "planets": []}
  },
  "source": "uploaded_image",
  "notes": "any observations about the chart"
}

If a value is unclear or not visible, use null. Return ONLY valid JSON, no other text."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": image_b64,
                    },
                },
                {"type": "text", "text": prompt}
            ],
        }]
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
