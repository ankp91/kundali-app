import anthropic
import os
from typing import Optional
from datetime import datetime

MODEL = "claude-sonnet-5"

# Prefer the personal direct Anthropic key; fall back to the work key
_api_key = os.environ.get("ANTHROPIC_VISION_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")


def _make_client() -> anthropic.Anthropic:
    # Explicitly set base_url to bypass ANTHROPIC_BASE_URL env var (Salesforce proxy)
    return anthropic.Anthropic(api_key=_api_key, base_url="https://api.anthropic.com")


def _call_claude(system: str, messages: list, max_tokens: int) -> str:
    resp = _make_client().messages.create(
        model=MODEL, max_tokens=max_tokens, system=system, messages=messages
    )
    return next((block.text for block in resp.content if hasattr(block, 'text')), '')


def _lang_instruction(language: str) -> str:
    if language == 'hi':
        return "\n\nIMPORTANT: Respond entirely in Hindi (Devanagari script). Use proper Jyotish terminology in Hindi where appropriate, but keep technical planet/sign/nakshatra names in both Hindi and their common English equivalents in brackets."
    return ""


def _stream_claude(system: str, messages: list, max_tokens: int):
    with _make_client().messages.stream(
        model=MODEL, max_tokens=max_tokens, system=system, messages=messages
    ) as stream:
        for chunk in stream.text_stream:
            yield chunk

SYSTEM_INTERPRET = """You are Jyotish Guru, an expert Vedic astrologer with deep mastery of TWO traditions — Parashari Jyotish AND Bhrigu Samhita. Always weave both frameworks into your readings.

## PARASHARI JYOTISH (Standard Vedic)
- The 12 houses (Bhavas) and their meanings
- The 9 planets (Navagrahas) — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu
- The 12 zodiac signs (Rashis) in sidereal astrology
- Nakshatras (27 lunar mansions) and their ruling deities
- Yogas (planetary combinations) — Raj, Dhana, Mahapurusha, Viparita, etc.
- Vimshottari Dasha system for timing
- Aspects (Drishti): Mars 4th/7th/8th, Jupiter 5th/7th/9th, Saturn 3rd/7th/10th

## BHRIGU SAMHITA FRAMEWORK
Apply these principles in every reading:

1. **Bhrigu Bindu** — The most sensitive point in the chart (midpoint of Rahu and Moon).
   - Any planet transiting over the Bhrigu Bindu triggers a MAJOR life event
   - Jupiter transiting Bhrigu Bindu = most significant turning point of that year
   - Saturn transiting Bhrigu Bindu = karmic reckoning, restructuring

2. **Jupiter as Master Timer (Bhrigu Nadi)** — Jupiter's transit over natal planets determines event timing:
   - Jupiter over natal Sun = career recognition, father-related events
   - Jupiter over natal Moon = emotional fulfilment, mother, home change
   - Jupiter over natal Mars = energy peak, property, siblings
   - Jupiter over natal Mercury = education, communication breakthroughs
   - Jupiter over natal Venus = marriage/relationship events, financial gains
   - Jupiter over natal Saturn = karmic rewards for past hard work
   - Jupiter over natal Rahu = foreign connections, unconventional opportunities
   - Jupiter over natal Ketu = spiritual turning points, letting go

3. **12th House Principle (Bhrigu)** — The 12th house FROM any planet shows the results/fruits of that planet:
   - E.g. 12th from Jupiter shows where wisdom and fortune FLOW TO
   - 12th from Venus shows where love and pleasure ultimately go
   - This reveals hidden channels of energy in the chart

4. **Saturn as Karma Significator** — Saturn's placement and transits show the karmic script:
   - Saturn in its own sign or exaltation = karma being worked off through discipline
   - Saturn transiting over natal planets = karmic lessons arriving through that planet's domain
   - Saturn return (~age 29-30, 58-60) = major life restructuring

5. **Past Life Karma Indicators**:
   - Ketu's house and sign = area of past-life mastery, may feel effortless but also stagnant
   - Rahu's house and sign = area of karmic hunger, soul's growth direction this life
   - 12th lord's placement = karmic debts being resolved
   - Planets in the 12th house = energies being "dissolved" or spiritualised

6. **Bhrigu's Reading of Specific Placements**:
   - Sun in 2nd = speech and wealth carry father's karma
   - Moon in 8th = deep karmic emotional journey, psychic sensitivity
   - Jupiter in 10th = dharmic career, position earned through past-life merit
   - Venus in 12th = love and beauty connected to spiritual realms or foreign lands
   - Rahu-Sun conjunction = soul hungering for authority and recognition
   - Ketu-Moon conjunction = emotional detachment as karmic lesson; spiritual insight through solitude

## HOW TO BLEND BOTH:
- Lead with Parashari (structural reading: planet + sign + house)
- Layer Bhrigu on top (karmic WHY, timing through Jupiter transits, Bhrigu Bindu events)
- For timing questions: use BOTH dasha AND Jupiter transit
- For "why does X keep happening": use Bhrigu karma indicators

## RESPONSE STYLE:
- Be specific and reference actual house/sign/planet placements
- Explain both positive and challenging aspects
- Use accessible language — avoid jargon without explanation
- Be balanced and constructive, not fatalistic
- Reference Sanskrit terms but always explain them in English
- For monthly/yearly analysis: always state which Jupiter transit is active and whether Jupiter is approaching the Bhrigu Bindu"""


def _placement_msg(planet: str, sign: str, house: int, chart_context: dict) -> str:
    return f"""Interpret {planet} in {sign} in house {house}.

Full chart context:
Ascendant: {chart_context.get('ascendant', {}).get('sign', 'Unknown')}
All planets: {chart_context.get('planets', {})}

Give a 3-4 paragraph interpretation covering:
1. What this placement means generally
2. How the sign modifies the planet's energy
3. What the house placement indicates for this person's life
4. Any notable yogas or aspects to watch"""


def interpret_placement(planet: str, sign: str, house: int, chart_context: dict) -> str:
    return _call_claude(SYSTEM_INTERPRET, [{"role": "user", "content": _placement_msg(planet, sign, house, chart_context)}], 1500)


def stream_placement(planet: str, sign: str, house: int, chart_context: dict, language: str = 'en'):
    msg = _placement_msg(planet, sign, house, chart_context) + _lang_instruction(language)
    return _stream_claude(SYSTEM_INTERPRET, [{"role": "user", "content": msg}], 1500)


def interpret_full_chart(chart_data: dict) -> str:
    asc = chart_data.get("ascendant", {})
    planets = chart_data.get("planets", {})
    dashas = chart_data.get("dashas", [])
    birth_info = chart_data.get("birth_info", {})
    bb = chart_data.get("bhrigu_bindu", {})

    planet_summary = "\n".join([
        f"- {p}: {d['sign']} (House {d['house']}, {d['degree']}°){' [R]' if d.get('is_retrograde') else ''}"
        for p, d in planets.items()
    ])

    current_dasha = next((d for d in dashas if d.get("is_current")), None)
    dasha_summary = ""
    if dashas:
        dasha_summary = "\nVimshottari Dasha sequence (full 120-year cycle):\n" + "\n".join([
            f"{'→ ' if d.get('is_current') else '  '}{d['lord']} Dasha ({d['years']} yrs): {d['start']} – {d['end']}{' ← CURRENT' if d.get('is_current') else ''}"
            for d in dashas
        ])

    today_str = datetime.now().strftime("%B %d, %Y")
    birth_line = ""
    if birth_info:
        birth_line = f"\nBirth: {birth_info.get('date')} {birth_info.get('time')} at {birth_info.get('place')} (Timezone: {birth_info.get('timezone')})"

    bb_line = f"\nBhrigu Bindu: {bb.get('sign')} (House {bb.get('house')}, {bb.get('degree')}°)" if bb else ""

    msg = f"""Give a comprehensive kundali reading for this chart using BOTH Parashari and Bhrigu Samhita frameworks.
Today's date: {today_str}
{birth_line}
Ascendant (Lagna): {asc.get('sign')} at {asc.get('degree')}°
{bb_line}
Planetary Positions:
{planet_summary}
{dasha_summary}

Cover:
1. Personality and life path (from Lagna) — Parashari + Bhrigu perspective
2. Key strengths in the chart
3. Areas requiring attention or growth (include karmic patterns from Bhrigu)
4. Notable yogas AND karmic indicators (Rahu-Ketu axis, 12th house principle)
5. Current dasha analysis with Jupiter transit timing (Bhrigu Nadi) — what is Jupiter transiting right now and what does it mean?
6. Bhrigu Bindu — which house/sign it falls in and when Jupiter will next transit it

Be warm, constructive and insightful. About 600 words."""

    return _call_claude(SYSTEM_INTERPRET, [{"role": "user", "content": msg}], 2000)


def stream_full_chart(chart_data: dict, language: str = 'en'):
    asc = chart_data.get("ascendant", {})
    planets = chart_data.get("planets", {})
    dashas = chart_data.get("dashas", [])
    birth_info = chart_data.get("birth_info", {})
    bb = chart_data.get("bhrigu_bindu", {})
    planet_summary = "\n".join([
        f"- {p}: {d['sign']} (House {d['house']}, {d['degree']}°){' [R]' if d.get('is_retrograde') else ''}"
        for p, d in planets.items()
    ])
    dasha_summary = ""
    if dashas:
        dasha_summary = "\nVimshottari Dasha sequence (full 120-year cycle):\n" + "\n".join([
            f"{'→ ' if d.get('is_current') else '  '}{d['lord']} Dasha ({d['years']} yrs): {d['start']} – {d['end']}{' ← CURRENT' if d.get('is_current') else ''}"
            for d in dashas
        ])
    today_str = datetime.now().strftime("%B %d, %Y")
    birth_line = f"\nBirth: {birth_info.get('date')} {birth_info.get('time')} at {birth_info.get('place')} (Timezone: {birth_info.get('timezone')})" if birth_info else ""
    bb_line = f"\nBhrigu Bindu: {bb.get('sign')} (House {bb.get('house')}, {bb.get('degree')}°)" if bb else ""
    msg = f"""Give a comprehensive kundali reading for this chart using BOTH Parashari and Bhrigu Samhita frameworks.
Today's date: {today_str}
{birth_line}
Ascendant (Lagna): {asc.get('sign')} at {asc.get('degree')}°
{bb_line}
Planetary Positions:
{planet_summary}
{dasha_summary}

Cover:
1. Personality and life path (from Lagna) — Parashari + Bhrigu perspective
2. Key strengths in the chart
3. Areas requiring attention or growth (include karmic patterns from Bhrigu)
4. Notable yogas AND karmic indicators (Rahu-Ketu axis, 12th house principle)
5. Current dasha analysis with Jupiter transit timing (Bhrigu Nadi) — what is Jupiter transiting right now and what does it mean?
6. Bhrigu Bindu — which house/sign it falls in and when Jupiter will next transit it

Be warm, constructive and insightful. About 600 words.""" + _lang_instruction(language)
    return _stream_claude(SYSTEM_INTERPRET, [{"role": "user", "content": msg}], 2000)


def chat_with_chart(message: str, chart_data: dict, history: list) -> str:
    asc = chart_data.get("ascendant", {})
    planets = chart_data.get("planets", {})
    planet_summary = "\n".join([
        f"{p}: {d['sign']} House {d['house']}"
        for p, d in planets.items()
    ])

    dashas = chart_data.get("dashas", [])
    birth_info = chart_data.get("birth_info", {})
    current_dasha = next((d for d in dashas if d.get("is_current")), None)
    dasha_line = f"\nCurrent Dasha: {current_dasha['lord']} ({current_dasha['start']} – {current_dasha['end']})" if current_dasha else ""
    birth_line = f"\nBirth: {birth_info.get('date')} {birth_info.get('time')} at {birth_info.get('place')}" if birth_info else ""
    today_str = datetime.now().strftime("%B %d, %Y")
    bb = chart_data.get("bhrigu_bindu", {})
    bb_line = f"\nBhrigu Bindu: {bb.get('sign')} House {bb.get('house')} at {bb.get('degree')}°" if bb else ""

    system = f"""{SYSTEM_INTERPRET}

TODAY'S DATE: {today_str}
Always use this date when answering questions about current transits, current month, next month, or any time-sensitive analysis. Never use a past date.

The user's kundali:{birth_line}
Ascendant: {asc.get('sign')} {asc.get('degree')}°
{planet_summary}{dasha_line}{bb_line}

Apply both Parashari AND Bhrigu Samhita frameworks. For time-sensitive questions, always mention the current Jupiter transit position and whether Jupiter is approaching the Bhrigu Bindu."""

    messages = history + [{"role": "user", "content": message}]
    return _call_claude(system, messages, 2000)


def stream_chat(message: str, chart_data: dict, history: list, language: str = 'en'):
    asc = chart_data.get("ascendant", {})
    planets = chart_data.get("planets", {})
    planet_summary = "\n".join([f"{p}: {d['sign']} House {d['house']}" for p, d in planets.items()])
    dashas = chart_data.get("dashas", [])
    birth_info = chart_data.get("birth_info", {})
    current_dasha = next((d for d in dashas if d.get("is_current")), None)
    dasha_line = f"\nCurrent Dasha: {current_dasha['lord']} ({current_dasha['start']} – {current_dasha['end']})" if current_dasha else ""
    birth_line = f"\nBirth: {birth_info.get('date')} {birth_info.get('time')} at {birth_info.get('place')}" if birth_info else ""
    today_str = datetime.now().strftime("%B %d, %Y")
    bb = chart_data.get("bhrigu_bindu", {})
    bb_line = f"\nBhrigu Bindu: {bb.get('sign')} House {bb.get('house')} at {bb.get('degree')}°" if bb else ""
    system = f"""{SYSTEM_INTERPRET}

TODAY'S DATE: {today_str}
Always use this date when answering questions about current transits, current month, next month, or any time-sensitive analysis. Never use a past date.

The user's kundali:{birth_line}
Ascendant: {asc.get('sign')} {asc.get('degree')}°
{planet_summary}{dasha_line}{bb_line}

Apply both Parashari AND Bhrigu Samhita frameworks. For time-sensitive questions, always mention the current Jupiter transit position and whether Jupiter is approaching the Bhrigu Bindu.""" + _lang_instruction(language)
    messages = history + [{"role": "user", "content": message}]
    return _stream_claude(system, messages, 2000)


LESSONS = [
    {
        "id": "houses",
        "title": "The 12 Houses (Bhavas)",
        "icon": "🏠",
        "description": "The foundation of any kundali — learn what each house governs",
        "topics": [
            {"house": 1, "name": "Lagna (Ascendant)", "governs": "Self, personality, physical body, overall life direction"},
            {"house": 2, "name": "Dhana Bhava", "governs": "Wealth, speech, family, food, face"},
            {"house": 3, "name": "Parakrama Bhava", "governs": "Courage, siblings, communication, short journeys"},
            {"house": 4, "name": "Sukha Bhava", "governs": "Home, mother, happiness, property, vehicles"},
            {"house": 5, "name": "Putra Bhava", "governs": "Children, creativity, intelligence, romance, past life merit"},
            {"house": 6, "name": "Ripu Bhava", "governs": "Enemies, health, debts, service, daily routine"},
            {"house": 7, "name": "Kalatra Bhava", "governs": "Marriage, partnerships, business, foreign travel"},
            {"house": 8, "name": "Mrityu Bhava", "governs": "Transformation, occult, inheritance, longevity"},
            {"house": 9, "name": "Dharma Bhava", "governs": "Luck, father, spirituality, higher education, religion"},
            {"house": 10, "name": "Karma Bhava", "governs": "Career, status, fame, authority, public image"},
            {"house": 11, "name": "Labha Bhava", "governs": "Gains, income, elder siblings, social networks"},
            {"house": 12, "name": "Vyaya Bhava", "governs": "Loss, liberation, foreign lands, spirituality, expenses"},
        ]
    },
    {
        "id": "signs",
        "title": "The 12 Rashis (Signs)",
        "icon": "♈",
        "description": "How each zodiac sign colours planetary energy",
        "topics": [
            {"sign": "Aries (Mesha)", "element": "Fire", "ruler": "Mars", "quality": "Cardinal", "traits": "Dynamic, pioneering, impulsive, courageous"},
            {"sign": "Taurus (Vrishabha)", "element": "Earth", "ruler": "Venus", "quality": "Fixed", "traits": "Patient, sensual, stubborn, reliable"},
            {"sign": "Gemini (Mithuna)", "element": "Air", "ruler": "Mercury", "quality": "Mutable", "traits": "Communicative, versatile, curious, restless"},
            {"sign": "Cancer (Karka)", "element": "Water", "ruler": "Moon", "quality": "Cardinal", "traits": "Nurturing, emotional, intuitive, protective"},
            {"sign": "Leo (Simha)", "element": "Fire", "ruler": "Sun", "quality": "Fixed", "traits": "Confident, generous, dramatic, leadership"},
            {"sign": "Virgo (Kanya)", "element": "Earth", "ruler": "Mercury", "quality": "Mutable", "traits": "Analytical, practical, critical, service-oriented"},
            {"sign": "Libra (Tula)", "element": "Air", "ruler": "Venus", "quality": "Cardinal", "traits": "Balanced, diplomatic, aesthetic, partnership-oriented"},
            {"sign": "Scorpio (Vrishchika)", "element": "Water", "ruler": "Mars", "quality": "Fixed", "traits": "Intense, transformative, secretive, powerful"},
            {"sign": "Sagittarius (Dhanu)", "element": "Fire", "ruler": "Jupiter", "quality": "Mutable", "traits": "Optimistic, philosophical, adventurous, truthful"},
            {"sign": "Capricorn (Makara)", "element": "Earth", "ruler": "Saturn", "quality": "Cardinal", "traits": "Ambitious, disciplined, practical, responsible"},
            {"sign": "Aquarius (Kumbha)", "element": "Air", "ruler": "Saturn", "quality": "Fixed", "traits": "Humanitarian, innovative, detached, idealistic"},
            {"sign": "Pisces (Meena)", "element": "Water", "ruler": "Jupiter", "quality": "Mutable", "traits": "Compassionate, dreamy, spiritual, self-sacrificing"},
        ]
    },
    {
        "id": "planets",
        "title": "The 9 Grahas (Planets)",
        "icon": "🪐",
        "description": "Understanding the cosmic forces — the nine planets of Vedic astrology",
        "topics": [
            {"planet": "Sun (Surya)", "represents": "Soul, ego, father, authority, health, government", "exalted": "Aries", "debilitated": "Libra"},
            {"planet": "Moon (Chandra)", "represents": "Mind, emotions, mother, public, intuition, nourishment", "exalted": "Taurus", "debilitated": "Scorpio"},
            {"planet": "Mercury (Budha)", "represents": "Intelligence, communication, business, logic, education", "exalted": "Virgo", "debilitated": "Pisces"},
            {"planet": "Venus (Shukra)", "represents": "Love, beauty, arts, luxury, relationships, creativity", "exalted": "Pisces", "debilitated": "Virgo"},
            {"planet": "Mars (Mangala)", "represents": "Energy, courage, aggression, siblings, land, surgery", "exalted": "Capricorn", "debilitated": "Cancer"},
            {"planet": "Jupiter (Guru)", "represents": "Wisdom, expansion, luck, children, spirituality, teaching", "exalted": "Cancer", "debilitated": "Capricorn"},
            {"planet": "Saturn (Shani)", "represents": "Discipline, karma, delays, longevity, service, limitation", "exalted": "Libra", "debilitated": "Aries"},
            {"planet": "Rahu (North Node)", "represents": "Obsession, worldly desires, foreign, technology, illusion", "exalted": "Gemini", "debilitated": "Sagittarius"},
            {"planet": "Ketu (South Node)", "represents": "Spirituality, liberation, past life, intuition, detachment", "exalted": "Sagittarius", "debilitated": "Gemini"},
        ]
    },
    {
        "id": "nakshatras",
        "title": "Nakshatras (Lunar Mansions)",
        "icon": "⭐",
        "description": "The 27 lunar mansions — finer divisions of the zodiac",
        "topics": [
            {"nakshatra": "Ashwini", "deity": "Ashwini Kumaras", "symbol": "Horse head", "quality": "Swift healing, beginnings"},
            {"nakshatra": "Rohini", "deity": "Brahma/Prajapati", "symbol": "Cart/chariot", "quality": "Fertility, creativity, sensuality"},
            {"nakshatra": "Ardra", "deity": "Rudra", "symbol": "Teardrop/diamond", "quality": "Transformation through storms"},
            {"nakshatra": "Pushya", "deity": "Brihaspati", "symbol": "Lotus/flower/circle", "quality": "Nourishment, protection, spirituality"},
            {"nakshatra": "Magha", "deity": "Pitrs (ancestors)", "symbol": "Royal throne", "quality": "Authority, ancestral power"},
            {"nakshatra": "Chitra", "deity": "Vishwakarma", "symbol": "Bright jewel/pearl", "quality": "Creativity, craftsmanship, brilliance"},
            {"nakshatra": "Swati", "deity": "Vayu", "symbol": "Sword/coral", "quality": "Independence, flexibility, trade"},
            {"nakshatra": "Jyeshtha", "deity": "Indra", "symbol": "Circular amulet/earring", "quality": "Seniority, protection, occult"},
            {"nakshatra": "Shravana", "deity": "Vishnu", "symbol": "Ear/three footprints", "quality": "Listening, learning, connection"},
            {"nakshatra": "Revati", "deity": "Pushan", "symbol": "Fish/pair of fish", "quality": "Nurturing, journey's end, completion"},
        ]
    },
    {
        "id": "dashas",
        "title": "Vimshottari Dasha System",
        "icon": "⏳",
        "description": "Planetary periods — the timing system of Vedic astrology",
        "topics": [
            {"lord": "Ketu", "years": 7, "themes": "Spirituality, detachment, past karma, isolation, moksha"},
            {"lord": "Venus", "years": 20, "themes": "Relationships, luxury, arts, sensual pleasures, marriage"},
            {"lord": "Sun", "years": 6, "themes": "Authority, father, career, ego, government, fame"},
            {"lord": "Moon", "years": 10, "themes": "Mind, emotions, mother, home, public life, nourishment"},
            {"lord": "Mars", "years": 7, "themes": "Energy, ambition, property, siblings, surgery, sports"},
            {"lord": "Rahu", "years": 18, "themes": "Worldly success, ambition, foreign, unconventional paths"},
            {"lord": "Jupiter", "years": 16, "themes": "Wisdom, expansion, spirituality, children, teaching"},
            {"lord": "Saturn", "years": 19, "themes": "Hard work, discipline, karma, delays, longevity"},
            {"lord": "Mercury", "years": 17, "themes": "Communication, business, education, intellect, logic"},
        ]
    },
    {
        "id": "yogas",
        "title": "Important Yogas",
        "icon": "✨",
        "description": "Powerful planetary combinations that shape destiny",
        "topics": [
            {"yoga": "Raj Yoga", "formation": "Lords of Kendra (1,4,7,10) and Trikona (1,5,9) houses in conjunction or mutual aspect", "effect": "Power, authority, success"},
            {"yoga": "Dhana Yoga", "formation": "Lords of 1st, 2nd, 5th, 9th, 11th in conjunction", "effect": "Wealth and prosperity"},
            {"yoga": "Gaja Kesari Yoga", "formation": "Jupiter in Kendra from Moon (1,4,7,10)", "effect": "Elephant-lion strength, wisdom, fame"},
            {"yoga": "Pancha Mahapurusha Yoga", "formation": "Mars/Mercury/Jupiter/Venus/Saturn in own or exaltation sign in Kendra", "effect": "Great person of that planet's qualities"},
            {"yoga": "Budha-Aditya Yoga", "formation": "Sun and Mercury in same house", "effect": "Intelligence, good communication, government favor"},
            {"yoga": "Chandra-Mangala Yoga", "formation": "Moon and Mars in conjunction", "effect": "Wealth through bold action"},
            {"yoga": "Kemadruma Yoga", "formation": "No planets in 2nd or 12th from Moon", "effect": "Hardships, need for self-reliance"},
            {"yoga": "Viparita Raja Yoga", "formation": "Lords of 6th, 8th, 12th in mutual conjunction/exchange", "effect": "Rise through adversity"},
        ]
    },
    {
        "id": "bhrigu",
        "title": "Bhrigu Samhita",
        "icon": "📜",
        "description": "Ancient karmic astrology — Bhrigu Bindu, Jupiter timing, past-life patterns",
        "topics": [
            {"concept": "Bhrigu Bindu", "formula": "Midpoint of Rahu + Moon longitudes", "significance": "Most sensitive karmic point in the chart — Jupiter transiting it triggers the biggest life events of that year"},
            {"concept": "Jupiter as Master Timer (Bhrigu Nadi)", "formula": "Track Jupiter's transit over each natal planet", "significance": "Each Jupiter-over-natal-planet conjunction activates that planet's domain — the most reliable timing tool in Bhrigu tradition"},
            {"concept": "The 12th House Principle", "formula": "12th house FROM any planet = where that planet's energy flows and delivers results", "significance": "Reveals hidden channels: e.g. 12th from Jupiter shows where wisdom and fortune are actually expressed"},
            {"concept": "Saturn as Karma Significator", "formula": "Saturn's natal position + transits over natal planets", "significance": "Saturn shows the karmic script — where it sits reveals what must be earned through effort; Saturn transits bring karmic settlements"},
            {"concept": "Rahu-Ketu Axis (Karmic Spine)", "formula": "Rahu = karmic hunger (growth direction); Ketu = karmic mastery (past-life gift)", "significance": "The most important axis for understanding the soul's evolutionary journey across lifetimes"},
            {"concept": "Ketu-Moon Conjunction", "formula": "Moon within 15° of Ketu in any house", "significance": "Past-life emotional wisdom, spiritual sensitivity, tendency toward detachment — must consciously cultivate emotional groundedness this life"},
            {"concept": "Past Life Indicators", "formula": "12th lord placement + planets in 12th + Ketu's house", "significance": "Reveals karmic debts being dissolved, talents carried from past lives, and spiritual unfinished business"},
            {"concept": "Jupiter over Bhrigu Bindu", "formula": "When transiting Jupiter conjuncts the natal Bhrigu Bindu degree", "significance": "The single most significant transit of any year — triggers fated events in the Bhrigu Bindu's house domain. Occurs roughly every 12 years"},
            {"concept": "Saturn Return", "formula": "Saturn returns to natal position at ~age 29-30 and ~58-60", "significance": "Bhrigu sees this as the great karmic audit — major life restructuring, endings and beginnings aligned with soul's true path"},
            {"concept": "Bhrigu's Reading of Venus in 12th", "formula": "Venus placed in the 12th house", "significance": "Love and beauty are connected to hidden realms, foreign lands, or spiritual dimensions — relationships carry a quality of longing, sacrifice, or otherworldly beauty"},
        ]
    },
    {
        "id": "bhrigu_sun",
        "title": "Sun (Surya) Through 12 Houses — Bhrigu",
        "icon": "☉",
        "description": "Bhrigu Samhita's interpretation of Sun's placement in each house",
        "topics": [
            {"house": 1, "theme": "Soul & Vitality", "bhrigu_reading": "Strong leadership, radiant personality, father's karma shapes identity. Soul purpose tied to self-expression and authority. Health is robust; ego must be channelled constructively. Bhrigu sees this as the 'king' ascendant."},
            {"house": 2, "theme": "Wealth & Speech", "bhrigu_reading": "Wealth through government, father, or authority figures. Powerful commanding speech — words carry weight. Family karma involves pride and hierarchy. Financial ups tied to Sun's strength. Past-life connection to royalty or priesthood."},
            {"house": 3, "theme": "Courage & Communication", "bhrigu_reading": "Courageous communicator, success in writing, media, or administration. Siblings play a karmic role — often a rivalry or competition. Short journeys bring recognition. Bhrigu notes strong willpower in self-initiated efforts."},
            {"house": 4, "theme": "Home & Mother", "bhrigu_reading": "Happiness from property and vehicles. Possible tension between mother and father figures. Real estate gains in the Sun's dasha. The heart finds peace in ownership. Soul karma involves nurturing others while maintaining personal authority."},
            {"house": 5, "theme": "Creativity & Children", "bhrigu_reading": "Creative genius with leadership in artistic or speculative fields. Children bring honour and fame. Strong past-life merit with authority — good karmic credit being spent. Speculation and investments can yield gains."},
            {"house": 6, "theme": "Enemies & Health", "bhrigu_reading": "Victory over enemies and competitors — Sun burns opposition. Health issues in early life resolve with maturity. Service to authority or government is karmic duty. Healing professions favoured. Bhrigu sees this as burning past-life debts through service."},
            {"house": 7, "theme": "Partnership & Spouse", "bhrigu_reading": "Powerful or high-status spouse. Partnerships with authority figures and government connections. Possible ego conflicts in marriage — both partners have strong personalities. Foreign business partnerships. Soul karma around learning to share power."},
            {"house": 8, "theme": "Transformation & Longevity", "bhrigu_reading": "Long life (Ayush yoga potential). Deep interest in occult, hidden knowledge, or research. Father's karma affects longevity and inheritance. Sudden events shape character. Bhrigu sees this as the placement of the 'investigator soul' — one who must uncover hidden truths."},
            {"house": 9, "theme": "Fortune & Dharma", "bhrigu_reading": "Highly auspicious — one of the best placements for fortune and dharma. Father is a spiritual or philosophical guide. Foreign travel brings growth. Strong dharmic path and philosophical nature. Past-life merit from righteous deeds now bearing fruit."},
            {"house": 10, "theme": "Career & Fame", "bhrigu_reading": "Peak career placement — fame, government favour, and public recognition. Soul purpose is expressed through career. Leadership roles in government, administration, or authority structures. Bhrigu calls this the 'throne placement' — born to lead publicly."},
            {"house": 11, "theme": "Gains & Social Network", "bhrigu_reading": "Large financial gains, income from government or authority figures. Elder siblings and powerful social networks open doors. Ambitions are fulfilled. Bhrigu notes that wishes made with intention during this placement's dasha come true."},
            {"house": 12, "theme": "Liberation & Foreign Lands", "bhrigu_reading": "Spiritual liberation path. Expenses on foreign travel, spiritual pursuits, or hospitals. Isolation from mainstream authority is karmic. Past-life connection to monasteries or foreign kingdoms. Bhrigu sees this as the soul preparing for moksha through surrender of ego."},
        ]
    },
    {
        "id": "bhrigu_moon",
        "title": "Moon (Chandra) Through 12 Houses — Bhrigu",
        "icon": "☽",
        "description": "Bhrigu Samhita's interpretation of Moon's emotional and karmic placement",
        "topics": [
            {"house": 1, "theme": "Mind & Personality", "bhrigu_reading": "Deeply emotional, intuitive, and nurturing personality. The public face is warm and receptive. Strong mother connection shapes entire identity. Bhrigu notes this person is deeply affected by lunar cycles — mood and fortune wax and wane like the Moon. Psychic sensitivity is high."},
            {"house": 2, "theme": "Wealth & Family", "bhrigu_reading": "Wealth fluctuates with the Moon's phases — income rises and falls in cycles. Sweet, persuasive speech. Deep emotional attachment to family and possessions. Good memory and imagination. Bhrigu sees past-life connection to trade, food, or family business."},
            {"house": 3, "theme": "Communication & Siblings", "bhrigu_reading": "Frequent short journeys, emotionally driven communication. Creative writing and poetry are natural gifts. Siblings carry emotional karma — bonds are deep but can be turbulent. Courage comes in waves. Bhrigu notes success in media, publishing, or counselling."},
            {"house": 4, "theme": "Home & Mother", "bhrigu_reading": "Moon in its own domain — strong emotional security from home and mother. Happy domestic life, real estate prosperity. Deep past-life connection to the land. Bhrigu sees this as one of the most comforting placements — the soul is 'at home' in this life."},
            {"house": 5, "theme": "Children & Creativity", "bhrigu_reading": "Deep love for children; children bring emotional fulfilment. Romantic and imaginative nature. Intuitive intelligence over analytical. Past-life creative merit returns as artistic talent. Speculation and romance are areas of joy but also emotional vulnerability."},
            {"house": 6, "theme": "Health & Service", "bhrigu_reading": "Emotional health is the primary challenge — anxiety, worry, stomach and fluid issues. Service to others is karmic duty. Victory over enemies through emotional intelligence. Bhrigu notes this placement often produces healers, nurses, or counsellors — the soul that transforms its wounds into medicine."},
            {"house": 7, "theme": "Marriage & Partnership", "bhrigu_reading": "Beautiful, emotional, or nurturing spouse. Public-facing partnerships thrive. Emotional investment in relationships is total — breakups hit deeply. Bhrigu sees past-life partnership karma playing out; the soul must learn to love without losing itself."},
            {"house": 8, "theme": "Transformation & Psychic Depths", "bhrigu_reading": "Psychic abilities, emotional turbulence, and deep transformative experiences. The Moon in the 8th (Randhra Bhava) is one of Bhrigu's most karmic placements — emotional crises are the vehicle for soul evolution. Ketu conjunction here indicates past-life spiritual knowledge surfacing through emotional intensity."},
            {"house": 9, "theme": "Fortune & Spirituality", "bhrigu_reading": "Spiritual and philosophical mind. Fortune comes through mother, travel, or religious devotion. Emotional connection to dharma and higher wisdom. Bhrigu sees this as a soul that has accumulated spiritual merit across lifetimes, now being distributed as fortune and wisdom."},
            {"house": 10, "theme": "Career & Public Life", "bhrigu_reading": "Highly public career — fame, recognition, and emotional investment in one's work. Mother's influence on profession is strong. Careers in public service, hospitality, or anything serving the masses are indicated. Bhrigu notes emotional volatility in career — the Moon brings cycles of highs and lows in professional life."},
            {"house": 11, "theme": "Gains & Fulfilment", "bhrigu_reading": "Emotional fulfilment through gains and friendships. Large social network, popular and well-loved. Income fluctuates but generally grows over time. Elder siblings or female friends are karmic allies. Wishes and desires find fulfilment — the Moon here pours abundance."},
            {"house": 12, "theme": "Spirituality & Liberation", "bhrigu_reading": "Deeply spiritual emotional nature. Connection to foreign lands, hospitals, or ashrams. Sleep may be rich with dreams and visions. Past-life connection to monasticism or devotional practice. Bhrigu sees this as the soul's final emotional letting-go — preparing for liberation through surrender."},
        ]
    },
    {
        "id": "bhrigu_venus_mars",
        "title": "Venus & Mars Through 12 Houses — Bhrigu",
        "icon": "♀♂",
        "description": "Bhrigu's reading of Venus (love, beauty) and Mars (energy, action) in each house",
        "topics": [
            {"house": 1, "venus_bhrigu": "Attractive, charming personality; love of beauty and comfort shapes identity; artistic nature; Bhrigu sees past-life connection to arts or luxury", "mars_bhrigu": "Courageous, energetic, warrior personality; Ruchaka Yoga if in own sign or exalted; physical vitality is exceptional; Bhrigu notes this soul earned courage through past-life battles"},
            {"house": 2, "venus_bhrigu": "Significant wealth through beauty, arts, or relationships; sweet persuasive speech; family enjoys luxury; Bhrigu sees financial karma resolved through creative work", "mars_bhrigu": "Wealth through land, property, or bold enterprise; speech can be sharp or aggressive; siblings involved in finances; past-life debt around resources"},
            {"house": 3, "venus_bhrigu": "Artistic communication; success in creative writing, music, or design; siblings are emotionally supportive; short journeys bring love connections", "mars_bhrigu": "Exceptional courage and initiative; success in self-effort; siblings play competitive or inspiring role; Bhrigu notes this warrior communicator excels in debate, sports, or military fields"},
            {"house": 4, "venus_bhrigu": "Beautiful home, happy domestic life; love of vehicles and property; strong mother bond; past-life karma of domestic beauty and comfort", "mars_bhrigu": "Property and real estate gains; possible conflict with mother; courage applied to building a home base; Bhrigu warns against impatience in domestic matters"},
            {"house": 5, "venus_bhrigu": "Romantic, creative, deeply loving nature; beautiful children; past-life artistic merit; Bhrigu sees this as one of Venus's most joyful placements — love flows freely", "mars_bhrigu": "Competitive intelligence; children are energetic or sports-oriented; risk-taking in speculation; Bhrigu notes courage in creative enterprises but warns against gambling impulses"},
            {"house": 6, "venus_bhrigu": "Love relationships may face obstacles or competition; success over enemies through diplomacy; health issues around kidneys or sugar; Bhrigu advises using Venus's charm to resolve conflicts gracefully", "mars_bhrigu": "Mars's strongest placement for defeating enemies; excellent for competitive fields; victory in litigation; health and vitality exceptional; Bhrigu calls this the 'warrior healer' — one who conquers through directed force"},
            {"house": 7, "venus_bhrigu": "Beautiful, artistic, or wealthy spouse; strong marriage; Bhrigu sees this as Venus in its natural home — relationships are the soul's primary karmic arena this life; business partnerships thrive", "mars_bhrigu": "Dynamic, courageous, or competitive spouse; marriage involves passion and conflict; Bhrigu warns of possible Mangal dosha effects; business partnerships with drive and ambition"},
            {"house": 8, "venus_bhrigu": "Hidden or unconventional love; interest in occult beauty; inheritance through spouse; Bhrigu sees past-life karmic love stories playing out through sudden transformations in relationships", "mars_bhrigu": "Intense, transformative energy; interest in occult or hidden realms; inheritance through conflict; longevity indicated if Mars is strong; Bhrigu notes powerful karmic clearing through crises"},
            {"house": 9, "venus_bhrigu": "Fortune through relationships, arts, or foreign travel; spiritual beauty; father or guru is a source of love; Bhrigu sees past-life dharmic connection to beauty and divine love", "mars_bhrigu": "Dharmic warrior; fortune through courage and right action; father is a strong, martial figure; foreign travel involves adventure; Bhrigu sees this as karmic merit from past-life protection of the righteous"},
            {"house": 10, "venus_bhrigu": "Career in arts, beauty, fashion, music, or diplomacy; public recognition for Venus qualities; Bhrigu sees fame through beautiful or harmonious work", "mars_bhrigu": "Highly ambitious career; leadership and authority through direct action; excellent for military, law, surgery, or business; Bhrigu calls this the 'commander's placement' — natural executive energy"},
            {"house": 11, "venus_bhrigu": "Gains through arts, relationships, or luxury goods; large social network of beautiful or artistic people; desires and wishes around love and beauty are fulfilled", "mars_bhrigu": "Large gains through bold action; competitive social networks; elder siblings are ambitious allies; income through land, sports, or enterprise; Bhrigu notes persistent effort turns into significant wealth"},
            {"house": 12, "venus_bhrigu": "Love connected to foreign lands, spirituality, or hidden realms; expenses on luxury or relationships; Bhrigu sees this as the 'romantic exile' — love is real but elusive; past-life connection to devotional love", "mars_bhrigu": "Energy directed toward foreign lands, spirituality, or hidden battles; possible losses through aggression; Bhrigu advises channelling Mars's fire into spiritual discipline to avoid self-undoing"},
        ]
    },
    {
        "id": "bhrigu_mercury_jupiter",
        "title": "Mercury & Jupiter Through 12 Houses — Bhrigu",
        "icon": "☿♃",
        "description": "Bhrigu's reading of Mercury (intelligence, communication) and Jupiter (wisdom, fortune) in each house",
        "topics": [
            {"house": 1, "mercury_bhrigu": "Intelligent, communicative, youthful personality; analytical mind; success through intellect; Bhrigu notes this soul brings past-life scholarly karma into this life's identity", "jupiter_bhrigu": "Wise, philosophical, generous personality; Hamsa Yoga if exalted or in own sign; Bhrigu sees this as a soul carrying immense past-life merit — wisdom and good fortune flow naturally"},
            {"house": 2, "mercury_bhrigu": "Eloquent speech; wealth through trade, writing, or communication; Bhrigu sees financial karma resolved through intellectual work; good at accumulating knowledge and money", "jupiter_bhrigu": "Great wealth and powerful speech; family is learned or respected; Bhrigu calls this one of the best positions for prosperity — Jupiter expands all 2nd house matters including wealth, family, and eloquence"},
            {"house": 3, "mercury_bhrigu": "Brilliant communicator; success in writing, media, or teaching; frequent short journeys for intellectual purposes; siblings are intellectually stimulating; Bhrigu sees journalism, publishing, or technology as natural careers", "jupiter_bhrigu": "Courage backed by wisdom; siblings are learned; success in writing philosophical or spiritual content; Bhrigu notes this person inspires others through communication"},
            {"house": 4, "mercury_bhrigu": "Intellectual home environment; educated mother; property through intellectual work; happiness from learning; Bhrigu sees a past-life connection to libraries, education, or scholarly families", "jupiter_bhrigu": "Happy, prosperous home life; educated or spiritual mother; real estate gains; Bhrigu sees deep contentment in domestic life — the soul has earned its peaceful home through past-life dharmic living"},
            {"house": 5, "mercury_bhrigu": "Highly intelligent children; speculative gains through intellect; creative writing; Bhrigu notes exceptional analytical creativity — the mind generates both art and profit", "jupiter_bhrigu": "Highly fortunate — Putra Bhava with Jupiter brings wise, blessed children and speculative gains; Bhrigu calls this the 'merit treasury' — past-life good deeds returning as creativity, children, and luck"},
            {"house": 6, "mercury_bhrigu": "Victory over enemies through intelligence and strategy; success in analytical or service fields; health issues around nervous system; Bhrigu notes the mind can create anxiety — must be directed constructively", "jupiter_bhrigu": "Service through wisdom; Jupiter in 6th reduces enemies and health issues; Bhrigu notes that despite this being a challenging house, Jupiter's presence here brings grace — enemies become advisors"},
            {"house": 7, "mercury_bhrigu": "Intelligent, communicative spouse; business partnerships through trade or communication; Bhrigu sees marriage as an intellectual partnership — the mind is attracted to wit and knowledge", "jupiter_bhrigu": "Wise, generous, learned spouse; highly fortunate for marriage and partnerships; Bhrigu sees this as one of the best 7th house placements — the soul has earned a devoted, wise life partner through past-life dharmic relationships"},
            {"house": 8, "mercury_bhrigu": "Research and investigative abilities; interest in hidden knowledge; income through research or occult sciences; Bhrigu notes sudden transformations in communication or business", "jupiter_bhrigu": "Hidden wisdom; interest in spiritual and occult sciences; Bhrigu sees this as the 'hidden sage' — Jupiter's wisdom operates behind the scenes; inheritance and longevity are supported"},
            {"house": 9, "mercury_bhrigu": "Philosophical intellect; success in higher education, law, or publishing; father is communicative and intellectual; foreign travel for learning; Bhrigu sees past-life karmic connection to teaching and knowledge dissemination", "jupiter_bhrigu": "Extremely auspicious — Jupiter in the 9th (its natural house) creates Hamsa Yoga potential; immense fortune, wisdom, and dharmic fulfillment; Bhrigu calls this the 'guru's placement' — the soul IS the teacher"},
            {"house": 10, "mercury_bhrigu": "Career in communication, trade, writing, or technology; public recognition for intellect; Bhrigu sees the mind as the career — whatever Mercury signifies becomes the professional identity", "jupiter_bhrigu": "Peak career placement for Jupiter — wisdom, leadership, and dharmic recognition; Hamsa Yoga likely; Bhrigu calls this the 'throne of wisdom' — authority earned through knowledge and righteous action"},
            {"house": 11, "mercury_bhrigu": "Large gains through intellectual work; social networks of writers, traders, or communicators; fulfillment of desires through cleverness; Bhrigu notes the mind attracts abundance", "jupiter_bhrigu": "Enormous gains and fulfilled wishes; large social network of wise and fortunate people; Bhrigu sees this as Jupiter's most abundant placement for material results — wisdom translates directly into wealth"},
            {"house": 12, "mercury_bhrigu": "Mind oriented toward foreign lands, spirituality, or behind-the-scenes work; expenses through communication; Bhrigu sees this as the 'writer in exile' — brilliance expressed in solitude or foreign environments", "jupiter_bhrigu": "Spiritual wisdom; expenses on learning, foreign travel, or charity; Bhrigu sees this as a deeply spiritual Jupiter — the soul uses wisdom for liberation rather than accumulation; moksha is the ultimate goal"},
        ]
    },
    {
        "id": "bhrigu_saturn",
        "title": "Saturn (Shani) Through 12 Houses — Bhrigu",
        "icon": "♄",
        "description": "Bhrigu's karmic reading of Saturn — the great teacher and karma dispenser",
        "topics": [
            {"house": 1, "karmic_theme": "Karmic Self", "bhrigu_reading": "Serious, disciplined, responsible personality shaped by karmic weight. Life starts slowly but builds into lasting achievement. Bhrigu sees this as a soul carrying heavy karmic responsibility from past lives — perhaps a judge, administrator, or elder who must now learn self-compassion alongside duty. Health improves after 36.", "remedy": "Chant Shani Chalisa every Saturday. Donate black sesame seeds (til) and mustard oil."},
            {"house": 2, "karmic_theme": "Karmic Wealth", "bhrigu_reading": "Wealth comes slowly through sustained effort — no shortcuts exist here. Speech may be serious, dry, or blunt; learns tact over time. Family carries karmic lessons around scarcity or duty. Bhrigu notes that Saturn in 2nd often indicates a past life of wealth misused — now it must be earned honestly.", "remedy": "Feed crows and dogs regularly. Donate to the elderly."},
            {"house": 3, "karmic_theme": "Karmic Effort", "bhrigu_reading": "Extraordinary discipline in communication, effort, and skill-building. Saturn in Capricorn in 3rd is exceptionally strong — methodical, patient, outworks everyone. Siblings carry karmic weight. Bhrigu calls this the placement of the 'master craftsman' — whatever is built with these hands lasts.", "remedy": "Help younger siblings or neighbours. Practice a disciplined skill daily."},
            {"house": 4, "karmic_theme": "Karmic Home", "bhrigu_reading": "Domestic life carries responsibilities and limitations — property comes late. Mother may be serious or burdened. Bhrigu sees this as karmic clearing through home duties; peace at home is earned, not given. Saturn aspects the 10th house from here — career ambitions are tempered by domestic responsibilities.", "remedy": "Donate to old age homes. Keep the home clean and organised."},
            {"house": 5, "karmic_theme": "Karmic Intelligence", "bhrigu_reading": "Children may come late or carry responsibility. Speculation and risk must be avoided — Saturn in 5th penalises gambling. Intelligence is deep but serious. Bhrigu sees this as a soul learning not to take shortcuts with karma — merit must be earned through patience, not chance.", "remedy": "Teach underprivileged children. Donate educational materials."},
            {"house": 6, "karmic_theme": "Karmic Service", "bhrigu_reading": "Excellent for defeating enemies through persistent effort. Health discipline yields long life. Service industries, law, or medicine are natural. Bhrigu notes this as one of Saturn's better placements — the 6th house is a natural domain for Saturn's qualities of discipline and endurance.", "remedy": "Serve the sick or elderly. Work without expectation of reward."},
            {"house": 7, "karmic_theme": "Karmic Partnership", "bhrigu_reading": "Marriage comes late or involves karmic lessons — partner may be older, serious, or burdened. Business partnerships require careful contracts. Bhrigu sees this as the soul learning responsibility in relationships — love must be built through commitment, not passion. Delayed but durable bonds.", "remedy": "Respect elders and in-laws. Donate to widows or the elderly."},
            {"house": 8, "karmic_theme": "Karmic Transformation", "bhrigu_reading": "Exceptional longevity and research abilities. Interest in occult, karma, and hidden sciences. Bhrigu sees this as the 'karmic archaeologist' — one who uncovers hidden truths and resolves ancient debts. Transformation through patient endurance rather than sudden crisis.", "remedy": "Meditate on impermanence. Donate at funeral homes or hospitals."},
            {"house": 9, "karmic_theme": "Karmic Dharma", "bhrigu_reading": "Fortune comes through sustained dharmic effort. Father may be disciplined or distant. Philosophical nature leans toward traditional or conservative wisdom. Bhrigu sees this as the soul that must EARN its luck through righteous action — no free fortune here, only what dharma delivers.", "remedy": "Respect gurus and elders. Visit temples on Saturdays."},
            {"house": 10, "karmic_theme": "Karmic Career", "bhrigu_reading": "One of Saturn's most powerful placements — career built through sustained effort becomes monumental. Authority earned slowly is immovable. Bhrigu calls this the 'kingdom built stone by stone' — success after 36 is almost guaranteed if the person persists. Government, law, and administration are natural domains.", "remedy": "Do pro bono or charitable professional work. Respect authority."},
            {"house": 11, "karmic_theme": "Karmic Gains", "bhrigu_reading": "Gains come slowly but accumulate significantly over time. Elder siblings carry karma. Social networks are serious and purposeful. Bhrigu notes that Saturn in 11th eventually delivers — patience is rewarded with lasting prosperity. Ambitions are achieved in the second half of life.", "remedy": "Donate to elderly social causes. Maintain long-term friendships."},
            {"house": 12, "karmic_theme": "Karmic Liberation", "bhrigu_reading": "Expenses on spiritual disciplines, foreign travel, or service. Saturn in 12th is Bhrigu's placement of the 'karma worker' — one who spends this life resolving ancient debts through selfless service. Moksha is a genuine possibility. Sleep may be troubled until past-life karma is consciously addressed.", "remedy": "Serve in hospitals or ashrams. Practice Saturn's day (Saturday) as a day of fasting and service."},
        ]
    },
    {
        "id": "bhrigu_rahu_ketu",
        "title": "Rahu & Ketu Through 12 Houses — Bhrigu",
        "icon": "☊☋",
        "description": "The karmic spine — Bhrigu's reading of Rahu (soul's hunger) and Ketu (soul's mastery) in each house",
        "topics": [
            {"house": 1, "rahu_karma": "Soul hungers for strong identity, recognition, and self-mastery this life. May obsess over appearance or personal power. Bhrigu sees this as the soul stepping into unprecedented territory — defining itself without past-life precedent. Unusual, magnetic, unconventional personality.", "ketu_karma": "Past-life mastery in partnerships or relationships (Ketu in 7th). May feel ambivalent about marriage — deep inside, the soul has 'been there done that'. Spiritual detachment from relationships is the pattern to consciously transform."},
            {"house": 2, "rahu_karma": "Insatiable hunger for wealth, speech, and status. Obsession with accumulation. Bhrigu sees past-life poverty or powerlessness driving this life's material hunger. Speech can be exaggerated or manipulative without awareness — this must be watched.", "ketu_karma": "Past-life mastery in spirituality, foreign lands, or occult sciences (Ketu in 8th). The soul effortlessly accesses hidden knowledge and transformation. May feel detached from material accumulation."},
            {"house": 3, "rahu_karma": "Hunger for communication, bold action, and recognition through courage. Unconventional media or communication style. Bhrigu sees foreign or unusual methods of self-expression as the soul's growth edge.", "ketu_karma": "Past-life mastery in higher education, dharma, or philosophy (Ketu in 9th). Wisdom comes naturally. May feel detached from formal religion or traditional learning — the soul already knows it."},
            {"house": 4, "rahu_karma": "Hunger for home, property, comfort, and emotional security. Unconventional or foreign domestic life. Bhrigu sees the soul seeking roots it never had in past lives.", "ketu_karma": "Past-life mastery in career and public life (Ketu in 10th). Authority and public recognition come easily but may feel hollow. Soul is here to find meaning beyond achievement."},
            {"house": 5, "rahu_karma": "Hunger for creativity, romance, and children. Unconventional love affairs or creative pursuits. Past-life lack of joy now drives intense seeking of pleasure. Bhrigu advises conscious enjoyment without obsession.", "ketu_karma": "Past-life mastery in gains, social networks, and income (Ketu in 11th). Wealth flows easily but may not satisfy. Soul must discover that fulfilment comes from creativity and love, not accumulation."},
            {"house": 6, "rahu_karma": "Hunger to defeat enemies and overcome obstacles. Driven by competition and the need to prove superiority. Bhrigu sees a past-life victim now overcompensating through aggression. Service and health are growth areas.", "ketu_karma": "Past-life mastery in spiritual liberation and detachment (Ketu in 12th). Deeply comfortable with solitude, foreign environments, and spirituality. May seem detached or otherworldly to others."},
            {"house": 7, "rahu_karma": "Hunger for partnership, marriage, and the 'other'. Attracted to unconventional, foreign, or powerful partners. Bhrigu sees the soul discovering relationships for the first time — intense desire but also confusion about what partnership truly means.", "ketu_karma": "Past-life mastery in self (Ketu in 1st). The soul effortlessly knows itself. May seem self-sufficient to the point of seeming cold. Learning to invest in 'the other' is the soul's work."},
            {"house": 8, "rahu_karma": "Hunger for occult knowledge, hidden power, and transformation. Fascinated by death, mysticism, and the unknown. Bhrigu sees this as the soul drawn to power that transcends ordinary life — must guard against obsession with the dark side.", "ketu_karma": "Past-life mastery in wealth and speech (Ketu in 2nd). Financial matters feel effortless but may be taken for granted. Soul is here to learn depth and transformation beyond material security."},
            {"house": 9, "rahu_karma": "Hunger for dharma, fortune, foreign travel, and higher wisdom. Seeks gurus or philosophies unconventionally. Bhrigu sees the soul expanding its dharmic horizons beyond its cultural conditioning — spiritual growth comes through unorthodox paths.", "ketu_karma": "Past-life mastery in courage, communication, and siblings (Ketu in 3rd). Bold self-expression comes naturally. Soul may feel impatient with conventional learning — it already mastered the basics in past lives."},
            {"house": 10, "rahu_karma": "Intense hunger for career recognition, authority, and public status. Unconventional or foreign career path. Bhrigu sees this as the soul pushing into new professional territory — achieving what its lineage never achieved. Fame and ambition are the karmic fuel.", "ketu_karma": "Past-life mastery in home, comfort, and emotional security (Ketu in 4th). Domestic life feels effortless but the soul may resist putting down roots. Here to build a public legacy beyond private comfort."},
            {"house": 11, "rahu_karma": "Hunger for gains, social connections, and fulfilled desires. Unconventional income streams. Bhrigu sees past-life lack of abundance driving intense ambition for material and social success. Large networks form around unusual or foreign connections.", "ketu_karma": "Past-life mastery in creativity, romance, and children (Ketu in 5th). Creative gifts are natural. May feel detached from romance or children — the soul has loved deeply before and now seeks something beyond personal joy."},
            {"house": 12, "rahu_karma": "Hunger for liberation, foreign lands, and spiritual transcendence. This placement can either lead to enlightenment or escapism — Bhrigu notes the razor's edge here. The soul craves dissolution of the ego but must do it consciously.", "ketu_karma": "Past-life mastery in career and gains (Ketu in 6th). Service and daily work come naturally. May feel spiritually bored by worldly achievement. This life calls for surrender and transcendence rather than conquest."},
        ]
    },
    {
        "id": "bhrigu_nadi",
        "title": "Bhrigu Nadi — Jupiter Timing System",
        "icon": "⚡",
        "description": "The master timing technique — how Jupiter's transit over natal planets predicts life events year by year",
        "topics": [
            {"transit": "Jupiter over natal Sun", "trigger": "When Jupiter in transit conjuncts your natal Sun's degree", "life_domain": "Career, father, authority, recognition, health", "bhrigu_guidance": "A year of career recognition and authority. Father-related events (health, meetings, milestones). Government or institutional favour. Soul's purpose comes into sharper focus. Best time for promotions, public launches, or leadership roles. Occurs roughly every 12 years."},
            {"transit": "Jupiter over natal Moon", "trigger": "When Jupiter in transit conjuncts your natal Moon's degree", "life_domain": "Mind, emotions, mother, home, public life", "bhrigu_guidance": "Emotional fulfilment and mental expansion. Mother-related events or relocation. Public popularity rises. Ideal time for marriage discussions, home purchases, or emotional healing. The mind opens to new philosophical or spiritual understanding. One of the most nurturing Jupiter transits."},
            {"transit": "Jupiter over natal Mars", "trigger": "When Jupiter in transit conjuncts your natal Mars's degree", "life_domain": "Energy, property, siblings, courage, surgery", "bhrigu_guidance": "Energy and ambition peak. Property acquisitions or sibling events. Courage for bold new ventures is cosmically supported. Physical vitality is high. Ideal for starting businesses, buying land, or undertaking challenging physical goals. Bhrigu calls this the 'warrior's blessing year'."},
            {"transit": "Jupiter over natal Mercury", "trigger": "When Jupiter in transit conjuncts your natal Mercury's degree", "life_domain": "Intelligence, communication, education, business", "bhrigu_guidance": "Intellectual breakthroughs and educational milestones. Business negotiations succeed. Communication reaches a wider audience. Writing, publishing, or launching courses is highly favoured. Siblings may have positive milestones. Bhrigu notes this as one of the best transits for signing contracts and agreements."},
            {"transit": "Jupiter over natal Venus", "trigger": "When Jupiter in transit conjuncts your natal Venus's degree", "life_domain": "Love, marriage, beauty, arts, finance", "bhrigu_guidance": "One of the most celebrated Bhrigu transits for marriage and relationships. New love connections or deepening of existing bonds. Financial gains through arts, beauty, or partnerships. Creative projects flourish. Bhrigu notes this as the year to say 'yes' to love and beauty."},
            {"transit": "Jupiter Return", "trigger": "Jupiter returns to its natal position every ~12 years", "life_domain": "Wisdom, expansion, dharma, children, fortune", "bhrigu_guidance": "The Great Renewal — Jupiter return at ages ~12, 24, 36, 48, 60 marks major life chapter openings. Fortune, wisdom, and opportunity expand dramatically. Children may be born or achieve milestones. Bhrigu calls this the 'grace year' — the universe opens doors that remain closed for the surrounding 11 years."},
            {"transit": "Jupiter over natal Saturn", "trigger": "When Jupiter in transit conjuncts your natal Saturn's degree", "life_domain": "Karma, discipline, career structure, longevity", "bhrigu_guidance": "Karmic rewards for past sustained effort arrive. Long-standing structures in career or life receive Jupiter's blessing of expansion. Bhrigu notes this as the year when 'what you built patiently finally bears fruit'. Often coincides with promotions, recognition for years of service, or major structural life changes."},
            {"transit": "Jupiter over natal Rahu", "trigger": "When Jupiter in transit conjuncts your natal Rahu's degree", "life_domain": "Foreign connections, ambition, unconventional opportunities", "bhrigu_guidance": "Foreign travel, international connections, or unconventional opportunities expand dramatically. Ambitions that seemed out of reach become accessible. Technology and innovation intersect with fortune. Bhrigu notes this as a 'wildcard year' — expect the unexpected breakthrough."},
            {"transit": "Jupiter over natal Ketu", "trigger": "When Jupiter in transit conjuncts your natal Ketu's degree", "life_domain": "Spirituality, past-life karma, detachment, liberation", "bhrigu_guidance": "Deep spiritual turning point. Past-life karma surfaces for resolution. Intense inner work and potential for enlightenment experiences. Letting go of what no longer serves the soul's journey. Bhrigu calls this the 'moksha transit' — one of the most spiritually significant years of any 12-year cycle."},
            {"transit": "Jupiter over Bhrigu Bindu", "trigger": "When Jupiter in transit conjuncts the Bhrigu Bindu degree (midpoint of natal Rahu and Moon)", "life_domain": "The soul's most fated turning point — all life areas", "bhrigu_guidance": "The MOST significant transit in the entire Bhrigu system. When Jupiter crosses the Bhrigu Bindu, fated and irreversible life changes occur in the Bhrigu Bindu's house domain. Marriages, career pivots, relocations, or spiritual awakenings that define the entire chapter of life. Bhrigu Samhita was written specifically to predict what happens when Jupiter reaches this point. Mark this date in advance."},
        ]
    },
    {
        "id": "bhrigu_karma_remedies",
        "title": "Karmic Patterns & Remedies (Upayas)",
        "icon": "🙏",
        "description": "Bhrigu's framework for identifying karmic debts and the specific upayas (remedies) to resolve them",
        "topics": [
            {"pattern": "Sun Afflictions (weak, debilitated, or with malefics)", "karmic_cause": "Misuse of authority or disrespect to father/elders in past lives", "symptoms": "Strained relationship with father, career obstacles, ego issues, heart or eye problems", "upaya": "Offer water to the rising Sun daily with both hands. Chant Aditya Hridayam or Gayatri Mantra 108 times. Donate wheat and jaggery on Sundays. Respect father figures unconditionally."},
            {"pattern": "Moon Afflictions (Moon with Ketu, Rahu, or Saturn)", "karmic_cause": "Emotional manipulation, abandonment of maternal duties, or breaking of trust in past lives", "symptoms": "Emotional instability, anxiety, troubled relationship with mother, fluid-related health issues", "upaya": "Offer milk to Shiva on Mondays. Feed milk or rice to crows. Wear pearl or moonstone (only after astrological consultation). Practice Moon meditation on full moon nights. Honour the mother or mother figures."},
            {"pattern": "Mars Afflictions (Mangal Dosha, Mars with Rahu)", "karmic_cause": "Violence, aggression, or destruction of others' property or relationships in past lives", "symptoms": "Relationship conflicts, accidents, sibling rivalry, anger management issues, surgical interventions", "upaya": "Visit Hanuman temple every Tuesday. Chant Mangal Beej Mantra (Om Kram Kreem Kraum Sah Bhaumaya Namah). Donate red lentils and copper on Tuesdays. Practice controlled physical exercise to channel Mars energy."},
            {"pattern": "Mercury Afflictions (debilitated, with malefics)", "karmic_cause": "Deception in communication, fraud, or misuse of intelligence in past lives", "symptoms": "Communication difficulties, educational setbacks, business betrayals, nervous system issues", "upaya": "Feed green grass to cows on Wednesdays. Donate green mung dal and books to students. Chant Budha Beej Mantra. Avoid speaking falsehoods — even white lies activate Mercury's karma."},
            {"pattern": "Jupiter Afflictions (debilitated, with Rahu, or in 6/8/12)", "karmic_cause": "Disrespect to gurus, priests, or wise elders; misuse of knowledge or wealth in past lives", "symptoms": "Lack of fortune, difficult children, poor judgment, weight gain, financial mismanagement", "upaya": "Serve a guru or teacher selflessly. Donate yellow items, turmeric, or books on Thursdays. Chant Guru Beej Mantra. Feed Brahmin scholars or donate to educational institutions. Touch the feet of elders daily."},
            {"pattern": "Venus Afflictions (debilitated, with malefics, in 6/8/12)", "karmic_cause": "Betrayal in relationships, disrespect to women, or misuse of sensual pleasures in past lives", "symptoms": "Relationship difficulties, financial instability, creative blocks, reproductive health issues", "upaya": "Respect all women, especially mother and wife. Donate white items, rice, or white flowers on Fridays. Chant Shukra Beej Mantra. Feed white cows. Avoid overconsumption of alcohol or sensual pleasures."},
            {"pattern": "Saturn Afflictions (Sade Sati, Saturn with malefics)", "karmic_cause": "Neglect of duty, cruelty to servants or lower castes, or exploitation of labour in past lives", "symptoms": "Career delays, chronic illness, depression, legal troubles, relationship coldness", "upaya": "Serve the poor, elderly, or disabled — physically, not just financially. Light mustard oil lamp before Shani idol on Saturdays. Donate black sesame, iron, and blue cloth on Saturdays. Chant Shani Chalisa. Never disrespect workers or servants."},
            {"pattern": "Rahu Afflictions (Rahu with Sun, Moon, or in 1/7/8/12)", "karmic_cause": "Obsession, manipulation, or living through illusions and deception in past lives", "symptoms": "Confusion about identity or direction, foreign entanglements, unconventional compulsions, phobias", "upaya": "Chant Rahu Beej Mantra (Om Bhram Bhreem Bhraum Sah Rahave Namah). Donate coal, blue flowers, or radishes on Saturdays. Feed fish or reptiles. Develop one area of life with complete honesty and transparency to counterbalance Rahu's illusions."},
            {"pattern": "Ketu Afflictions (Ketu with Moon, in 1/4/7)", "karmic_cause": "Excessive spiritual detachment or abandonment of worldly duties in past lives; hermit-hood that left others unsupported", "symptoms": "Emotional detachment, vague health issues, dissatisfaction despite achievements, spiritual searching with no anchor", "upaya": "Chant Ketu Beej Mantra (Om Shram Shreem Shraum Sah Ketave Namah). Donate blankets and sesame on Tuesdays. Feed dogs. Embrace one concrete worldly responsibility — Ketu heals through grounding in the present, not more detachment."},
            {"pattern": "12th Lord Afflictions (12th lord weak or in tense houses)", "karmic_cause": "Unresolved karmic debts from foreign lands, hospitals, or institutions from past lives", "symptoms": "Unexplained expenses, isolation, foreign complications, spiritual restlessness, sleep disorders", "upaya": "Volunteer in hospitals, prisons, or shelters. Donate to foreign charities. Practice daily meditation before sleep. Keep the bedroom clean and sacred. Light a ghee lamp in the home's prayer space every evening."},
        ]
    }
]


def get_lessons() -> list:
    return [{"id": l["id"], "title": l["title"], "icon": l["icon"], "description": l["description"]} for l in LESSONS]


def get_lesson(lesson_id: str) -> Optional[dict]:
    for l in LESSONS:
        if l["id"] == lesson_id:
            return l
    return None


def explain_lesson_topic(lesson_id: str, topic: dict, user_chart: Optional[dict] = None, language: str = 'en') -> str:
    chart_context = ""
    if user_chart:
        asc = user_chart.get("ascendant", {})
        planets = user_chart.get("planets", {})
        chart_context = f"\n\nPersonalise the explanation for this chart:\nAscendant: {asc.get('sign')}\n" + \
            "\n".join([f"{p}: {d['sign']} House {d['house']}" for p, d in planets.items()])

    msg = f"""Explain this Vedic astrology concept in an engaging, educational way:

Topic: {topic}
Lesson category: {lesson_id}
{chart_context}

Requirements:
- 2-3 paragraphs
- Use clear language with Sanskrit terms explained
- Include real-world examples of how this manifests
- If chart context provided, relate it to the actual chart
- End with one practical insight or takeaway""" + _lang_instruction(language)

    return _call_claude(SYSTEM_INTERPRET, [{"role": "user", "content": msg}], 2000)


_DIV_INFO: dict = {
    'd9': {
        'name': 'Navamsa (D9)',
        'domain': 'marriage, soulmate connection, dharmic path, spiritual self, inner character',
        'instructions': (
            "1. D9 ascendant vs D1 ascendant — what does it reveal about the inner self vs. outer self?\n"
            "2. Venus in D9 — nature of the marriage partner and relationship potential\n"
            "3. Jupiter in D9 — spiritual growth and dharmic expansion\n"
            "4. Vargottama planets (same sign in D1 and D9) — greatly strengthened, note each one\n"
            "5. 7th house of D9 — what kind of partner is fated?\n"
            "6. Overall D9 story: is this a chart built for deep spiritual partnership or independence?"
        ),
    },
    'd10': {
        'name': 'Dasamsa (D10)',
        'domain': 'career, profession, public life, social status, authority',
        'instructions': (
            "1. D10 ascendant — the professional identity and public-facing persona\n"
            "2. Sun in D10 — authority, recognition, and career peak potential\n"
            "3. Saturn in D10 — karmic duty in career and sustained effort\n"
            "4. 10th house of D10 — the zenith of the professional story\n"
            "5. 11th house of D10 — career gains and income trajectory\n"
            "6. Best-suited fields and timing of career peaks based on dasha"
        ),
    },
    'd7': {
        'name': 'Saptamsa (D7)',
        'domain': 'children, progeny, creativity, procreative energy, legacy',
        'instructions': (
            "1. D7 ascendant — foundation of progeny karma and creative identity\n"
            "2. Jupiter in D7 — blessings for children and fertility indicators\n"
            "3. 5th house of D7 — direct indicator of children and their nature\n"
            "4. Moon in D7 — emotional bond with children\n"
            "5. Any malefics in 5th or afflicting Jupiter — challenges to consider\n"
            "6. Timing: when are children most likely based on dasha and D7?"
        ),
    },
    'd12': {
        'name': 'Dwadasamsa (D12)',
        'domain': 'parents, ancestral karma, lineage, inherited patterns',
        'instructions': (
            "1. D12 ascendant — the ancestral karma imprint on the soul\n"
            "2. Sun in D12 — father's karma and its influence on this life\n"
            "3. Moon in D12 — mother's karma and emotional inheritance\n"
            "4. 4th house of D12 — mother's side of the family\n"
            "5. 9th house of D12 — father's side and blessings or debts carried forward\n"
            "6. What karmic gifts or ancestral debts is this person born with?"
        ),
    },
}


def stream_divisional_chart(div_type: str, div_data: dict, d1_chart: dict, language: str = 'en'):
    info = _DIV_INFO.get(div_type, {'name': div_type.upper(), 'domain': '', 'instructions': ''})

    div_planets = div_data.get('planets', {})
    div_asc = div_data.get('ascendant', {})
    div_summary = "\n".join([
        f"- {p}: {d['sign']} (House {d['house']})"
        for p, d in div_planets.items()
    ])

    d1_asc = d1_chart.get('ascendant', {})
    d1_planets = d1_chart.get('planets', {})
    d1_summary = "\n".join([
        f"- {p}: {d['sign']} (House {d['house']}, {d.get('degree', '')}°){' [R]' if d.get('is_retrograde') else ''}"
        for p, d in d1_planets.items()
    ])

    vargottama = [
        p for p, pd in div_planets.items()
        if d1_planets.get(p, {}).get('sign') == pd.get('sign')
    ]
    vargottama_line = (
        f"\nVargottama planets (same sign in D1 and {div_type.upper()}, greatly strengthened): "
        + ", ".join(vargottama)
    ) if vargottama else ""

    msg = f"""Interpret this {info['name']} chart for the native.

Domain this chart governs: {info['domain']}

D1 (Natal) Chart — for context:
Ascendant: {d1_asc.get('sign')} at {d1_asc.get('degree', '')}°
{d1_summary}

{info['name']} Chart:
Ascendant: {div_asc.get('sign')}
{div_summary}{vargottama_line}

Interpretation focus (cover all of these):
{info['instructions']}

Give a warm, personalised 4-5 paragraph reading. Reference specific planetary placements from the chart above. Blend Parashari structure with Bhrigu karmic depth. About 400 words.""" + _lang_instruction(language)

    return _stream_claude(SYSTEM_INTERPRET, [{"role": "user", "content": msg}], 1800)


def interpret_match(match_data: dict, language: str = 'en') -> str:
    p1 = match_data.get("person1", {})
    p2 = match_data.get("person2", {})
    koots = match_data.get("koots", [])
    total = match_data.get("total_score", 0)
    verdict = match_data.get("verdict", "")
    mangal = match_data.get("mangal", {})
    today_str = datetime.now().strftime("%B %d, %Y")

    koot_summary = "\n".join([
        f"- {k['name']}: {k['score']}/{k['max']} — {k['meaning']}"
        for k in koots
    ])

    p1_chart = p1.get("chart", {})
    p2_chart = p2.get("chart", {})
    p1_asc = p1_chart.get("ascendant", {}).get("sign", "Unknown")
    p2_asc = p2_chart.get("ascendant", {}).get("sign", "Unknown")

    msg = f"""Give a comprehensive Kundali Milan (compatibility) reading using both Parashari and Bhrigu Samhita frameworks.

Today: {today_str}

PERSON 1: {p1.get('name')}
Moon Sign: {p1.get('moon_sign')} | Nakshatra: {p1.get('nakshatra')} | Ascendant: {p1_asc}

PERSON 2: {p2.get('name')}
Moon Sign: {p2.get('moon_sign')} | Nakshatra: {p2.get('nakshatra')} | Ascendant: {p2_asc}

ASHTAKOOT SCORE: {total}/36 — {verdict}
{koot_summary}

MANGAL DOSHA: {mangal.get('note', 'Not checked')}

Cover:
1. Overall compatibility verdict — what does this score mean in practice?
2. Greatest strengths in this pairing (highlight the high-scoring koots)
3. Potential challenges (highlight low-scoring koots and what they mean practically)
4. Mangal Dosha analysis and remedies if applicable
5. Bhrigu perspective — karmic connection between these two souls based on Moon signs and nakshatras
6. Practical advice for making this relationship thrive
7. Auspicious timing — when are good periods for marriage or deepening commitment?

Be warm, honest, and constructive. About 500 words.""" + _lang_instruction(language)

    return _call_claude(SYSTEM_INTERPRET, [{"role": "user", "content": msg}], 2000)
