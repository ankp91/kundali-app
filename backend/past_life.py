"""Past Life Karma analysis based on classical Vedic sources.

Sources:
- BPHS Ch. 22: Purva Punya (5th house), 12th house moksha karma
- BPHS Ch. 47, 49: Ketu and Rahu placements
- Jaimini Sutras 1.1.27-32: Atmakaraka (highest-degree planet = soul significator)
- Bhrigu Bindu: Practitioner tradition (midpoint Rahu + Moon)
"""

from astro import SIGNS, SIGNS_HINDI, SIGN_LORDS, calculate_kundali

import anthropic
import os

_ANTHROPIC_KEY = os.environ.get("ANTHROPIC_VISION_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
_CLAUDE_MODEL = "claude-sonnet-4-6"

_SIGNS_HI = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"
]

# Ketu house themes — BPHS Ch. 47 / 49
_KETU_HOUSE_THEME = {
    1:  "past life focused on self-development, asceticism, or spiritual practice",
    2:  "past life accumulated wealth and family attachments; karmic debts around speech and possessions",
    3:  "mastery of courage, communication, and sibling bonds in a prior life",
    4:  "deep karmic bond with home, mother, and emotional security; previous life immersed in domestic affairs",
    5:  "Purva Punya — exceptional past life merit through devotion, creativity, and righteous actions",
    6:  "past life involvement with disease, conflict, servitude, or debt; karmic residue of enemies",
    7:  "past life deeply entangled in partnerships, marriage, and contractual relationships",
    8:  "prior life steeped in occult knowledge, hidden affairs, or sudden transformations",
    9:  "past life devoted to dharma, higher learning, and the guru-shishya tradition",
    10: "past life of authority, career achievement, and public responsibility",
    11: "past life rich in networks, gains, and fulfillment of desires",
    12: "past life spent in foreign lands, moksha-oriented spirituality, or service to the marginalised",
}

# Atmakaraka planet meanings — Jaimini Sutras 1.1.27-32
_AK_MEANING = {
    "Sun":     "the soul's journey centres on authority, individuality, and righteous ego (dharmic self-realisation)",
    "Moon":    "the soul's journey revolves around emotional intelligence, nurturing, and the dissolution of attachment",
    "Mars":    "the soul carries warrior karma — courage, discipline, and the transformation of anger into righteous action",
    "Mercury": "the soul's growth lies in mastering communication, discrimination, and intellectual humility",
    "Jupiter": "the soul's highest calling is wisdom, teaching, and expanding dharma in the world",
    "Venus":   "the soul seeks to purify desires — transforming attachment to beauty and pleasure into divine love",
    "Saturn":  "the soul carries the heaviest karmic load — lessons of patience, service, and detachment from the material",
}


def _ordinal(n: int) -> str:
    return f"{n}{'st' if n==1 else 'nd' if n==2 else 'rd' if n==3 else 'th'}"


def calculate_past_life(chart: dict) -> dict:
    """Extract all past-life karma indicators from a chart dict returned by calculate_kundali()."""
    planets = chart["planets"]
    ascendant = chart["ascendant"]
    asc_sign_num = ascendant["sign_num"]

    # ── Ketu ──────────────────────────────────────────────────────────────────
    ketu = planets["Ketu"]
    ketu_info = {
        "house": ketu["house"],
        "sign": ketu["sign"],
        "sign_hi": _SIGNS_HI[ketu["sign_num"]],
        "degrees": ketu["degree"],
        "theme": _KETU_HOUSE_THEME.get(ketu["house"], ""),
    }

    # ── Rahu ──────────────────────────────────────────────────────────────────
    rahu = planets["Rahu"]
    rahu_info = {
        "house": rahu["house"],
        "sign": rahu["sign"],
        "sign_hi": _SIGNS_HI[rahu["sign_num"]],
        "degrees": rahu["degree"],
    }

    # ── 5th house — Purva Punya (BPHS Ch. 22) ─────────────────────────────────
    fifth_sign_num = (asc_sign_num + 4) % 12
    fifth_lord = SIGN_LORDS[fifth_sign_num]
    fifth_lord_data = planets.get(fifth_lord, {})
    fifth_lord_house = fifth_lord_data.get("house", 0)
    planets_in_5th = [p for p, d in planets.items() if d.get("house") == 5]

    fifth_house = {
        "sign": SIGNS[fifth_sign_num],
        "sign_hi": _SIGNS_HI[fifth_sign_num],
        "lord": fifth_lord,
        "lord_house": fifth_lord_house,
        "lord_sign": fifth_lord_data.get("sign", ""),
        "planets_in_5th": planets_in_5th,
    }

    # ── 12th house — Moksha karma (BPHS Ch. 22) ───────────────────────────────
    twelfth_sign_num = (asc_sign_num + 11) % 12
    twelfth_lord = SIGN_LORDS[twelfth_sign_num]
    twelfth_lord_data = planets.get(twelfth_lord, {})
    twelfth_lord_house = twelfth_lord_data.get("house", 0)
    planets_in_12th = [p for p, d in planets.items() if d.get("house") == 12]

    twelfth_house = {
        "sign": SIGNS[twelfth_sign_num],
        "sign_hi": _SIGNS_HI[twelfth_sign_num],
        "lord": twelfth_lord,
        "lord_house": twelfth_lord_house,
        "lord_sign": twelfth_lord_data.get("sign", ""),
        "planets_in_12th": planets_in_12th,
    }

    # ── Atmakaraka — Jaimini Sutras 1.1.27-32 ────────────────────────────────
    # 7 planets only (not Rahu/Ketu); highest degree within sign = AK
    ak_candidates = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    ak_planet = max(ak_candidates, key=lambda p: planets[p]["degree"])
    ak_data = planets[ak_planet]
    atmakaraka = {
        "planet": ak_planet,
        "degrees": ak_data["degree"],
        "house": ak_data["house"],
        "sign": ak_data["sign"],
        "sign_hi": _SIGNS_HI[ak_data["sign_num"]],
        "meaning": _AK_MEANING.get(ak_planet, ""),
    }

    # ── Bhrigu Bindu (Practitioner tradition) ────────────────────────────────
    bb = chart.get("bhrigu_bindu", {})
    bhrigu_bindu = {
        "longitude": bb.get("longitude", 0.0),
        "sign": bb.get("sign", ""),
        "sign_hi": _SIGNS_HI[int(bb.get("longitude", 0) / 30) % 12] if bb else "",
        "house": bb.get("house", 0),
        "degrees": round(bb.get("longitude", 0) % 30, 2),
    }

    return {
        "ketu": ketu_info,
        "rahu": rahu_info,
        "fifth_house": fifth_house,
        "twelfth_house": twelfth_house,
        "atmakaraka": atmakaraka,
        "bhrigu_bindu": bhrigu_bindu,
    }


def _build_prompt(indicators: dict, name: str, language: str) -> str:
    ketu = indicators["ketu"]
    rahu = indicators["rahu"]
    fifth = indicators["fifth_house"]
    twelfth = indicators["twelfth_house"]
    ak = indicators["atmakaraka"]
    bb = indicators["bhrigu_bindu"]

    fifth_planets_str = ", ".join(fifth["planets_in_5th"]) if fifth["planets_in_5th"] else "none"
    twelfth_planets_str = ", ".join(twelfth["planets_in_12th"]) if twelfth["planets_in_12th"] else "none"

    lang_instruction = ""
    if language == "hi":
        lang_instruction = "\n\nIMPORTANT: Respond entirely in Hindi (Devanagari script). Use proper Jyotish terminology in Hindi. Keep planet/sign names in both Hindi and English in brackets."

    return f"""You are a Jyotish expert specialising in karmic analysis using verified classical texts — BPHS and Jaimini Sutras. This is a past life karma reading for {name}.

Classical Indicators:

1. KETU PLACEMENT (BPHS Ch. 47, 49):
   Ketu is in the {_ordinal(ketu['house'])} house in {ketu['sign']}
   Karmic theme: {ketu['theme']}

2. RAHU-KETU AXIS (BPHS Ch. 47):
   Ketu (past) in {_ordinal(ketu['house'])} house / Rahu (future direction) in {_ordinal(rahu['house'])} house in {rahu['sign']}
   This axis defines the soul's karmic journey — where it came from and where it is being pulled.

3. PURVA PUNYA — 5TH HOUSE (BPHS Ch. 22):
   5th house sign: {fifth['sign']} · Lord: {fifth['lord']} placed in {_ordinal(fifth['lord_house'])} house in {fifth['lord_sign']}
   Planets in 5th house: {fifth_planets_str}
   This indicates past-life merit (Purva Punya) that manifests as natural talents and fortunate conditions.

4. MOKSHA KARMA — 12TH HOUSE (BPHS Ch. 22):
   12th house sign: {twelfth['sign']} · Lord: {twelfth['lord']} placed in {_ordinal(twelfth['lord_house'])} house in {twelfth['lord_sign']}
   Planets in 12th house: {twelfth_planets_str}
   Indicates the nature of karmic resolution and path toward liberation in this life.

5. ATMAKARAKA (JAIMINI SUTRAS 1.1.27-32):
   {ak['planet']} at {ak['degrees']}° (highest degree among 7 planets) in {ak['sign']}, {_ordinal(ak['house'])} house
   Soul's primary karmic mission: {ak['meaning']}

6. BHRIGU BINDU (Practitioner tradition):
   At {bb['degrees']}° {bb['sign']}, {_ordinal(bb['house'])} house — the most sensitive karmic activation point.
   Any major transit over this point (especially Jupiter or Saturn) activates key karmic events.

Based on ONLY these classical indicators, provide a 4-paragraph past life karma reading:
Paragraph 1: Past life background — what karmic patterns {name} carried into this birth (Ketu + Rahu axis).
Paragraph 2: Past life merit and inherited gifts — what Purva Punya {name} brings into this life (5th house).
Paragraph 3: Soul's primary mission this life — the Atmakaraka's karmic agenda and the 12th house resolution path.
Paragraph 4: The Bhrigu Bindu point and when karmic activations are most potent; practical guidance.

Rules:
- Speak directly to {name} ("Your Ketu...", "You carry...", "Your soul...")
- Be specific to these exact placements — do not give generic information
- Use classical Jyotish language but explain Sanskrit terms
- Do not mention Western astrology
- Be constructive and illuminating, not fatalistic{lang_instruction}"""


def generate_past_life_interpretation(indicators: dict, name: str, language: str = "en") -> str:
    """Call Claude to generate the karmic interpretation."""
    client = anthropic.Anthropic(api_key=_ANTHROPIC_KEY, base_url="https://api.anthropic.com")
    prompt = _build_prompt(indicators, name, language)
    resp = client.messages.create(
        model=_CLAUDE_MODEL,
        max_tokens=2000,
        system=[{"type": "text", "text": "You are a Jyotish karma analyst. Provide accurate, classical-source-based past life readings.", "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": prompt}],
    )
    return next((block.text for block in resp.content if getattr(block, "type", "") == "text"), "")
