from __future__ import annotations
import swisseph as swe
import pytz
from datetime import datetime, date as date_cls
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder

swe.set_sid_mode(swe.SIDM_LAHIRI)

# ── Names ────────────────────────────────────────────────────────────────────

NAKSHATRA = [
    'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
    'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
    'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
    'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha',
    'Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
]
NAKSHATRA_HI = [
    'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा',
    'पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी','उत्तर फाल्गुनी',
    'हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा',
    'मूल','पूर्व आषाढ़','उत्तर आषाढ़','श्रवण','धनिष्ठा',
    'शतभिषा','पूर्व भाद्रपद','उत्तर भाद्रपद','रेवती',
]

TITHI = [
    'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
    'Shashthi','Saptami','Ashtami','Navami','Dashami',
    'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima',
    'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
    'Shashthi','Saptami','Ashtami','Navami','Dashami',
    'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Amavasya',
]

YOGA = [
    'Vishkambha','Priti','Ayushman','Saubhagya','Shobhana',
    'Atiganda','Sukarman','Dhriti','Shula','Ganda','Vriddhi',
    'Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata',
    'Variyana','Parigha','Shiva','Siddha','Sadhya','Shubha',
    'Shukla','Brahma','Indra','Vaidhriti',
]

KARANA_MOVABLE = ['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti']
KARANA_FIXED   = ['Shakuni','Chatushpada','Naga','Kimstughna']

VARA      = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
VARA_HI   = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार']
VARA_LORD = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

# 7 Choghadiya in cyclic order (full Sanskrit names matching Drik Panchang)
CHOG_NAMES  = ['Amrita','Kala','Shubha','Roga','Udvega','Chara','Labha']
CHOG_NATURE = {
    'Amrita':'very_good','Shubha':'good','Labha':'good',
    'Chara':'neutral','Udvega':'bad','Roga':'bad','Kala':'bad',
}
DAY_CHOG_START   = [4, 0, 3, 6, 2, 5, 1]
# Night start = first planetary hora of night (hora #13) for each weekday:
# Sun:Jupiter(Shubha=2) Mon:Venus(Chara=5) Tue:Saturn(Kala=1) Wed:Sun(Udvega=4)
# Thu:Moon(Amrita=0) Fri:Mars(Roga=3) Sat:Mercury(Labha=6)
NIGHT_CHOG_START = [2, 5, 1, 4, 0, 3, 6]

HORA_PLANETS   = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars']
HORA_DAY_START = [0, 3, 6, 2, 5, 1, 4]

# Inauspicious kalam slot numbers (1-indexed out of 8 equal day slots, Sun=index 0)
RAHU_KALAM_SLOT = [8, 2, 7, 5, 6, 3, 4]   # Sun=8(last), Mon=2, Tue=7, Wed=5, Thu=6, Fri=3, Sat=4
YAMAGANDA_SLOT  = [5, 4, 3, 2, 1, 7, 6]   # Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
GULIKAI_SLOT    = [7, 6, 5, 4, 3, 2, 1]   # Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1

# Slot (1-indexed) within the 8-slot day/night sequence for special periods (weekday: Sun=0..Sat=6)
# Verified against Drik Panchang (Mon Oct 12 + Wed Oct 21 2026, Feltham/London):
#   Mon: Kaal Vela=slot2, Vaar Vela=slot7, Kaal Ratri=slot4
#   Wed: Kaal Vela=slot3(10:14AM), Vaar Vela+Rahu Kalam=slot5(12:46PM), Kaal Ratri=slot7(04:15AM)
# Kaal Vela  = day slot where "Kala" choghadiya falls: solve (start+i)%7==1 → slot=(1-start)%7+1
# Kaal Ratri = night slot where "Labha" choghadiya falls: solve (start-2i)%7==6 → slot=i+1
# Vaar Vela  = 8-d pattern (counts down 1 slot each day: Sun=8,Mon=7,...,Sat=2)
KAAL_VELA_SLOT  = [5, 2, 6, 3, 7, 4, 1]
VAAR_VELA_SLOT  = [8, 7, 6, 5, 4, 3, 2]
KAAL_RATRI_SLOT = [6, 4, 2, 7, 5, 3, 1]

RITU_NAMES = ['Vasanta','Grishma','Varsha','Sharad','Hemanta','Shishira']

_MASA_NAMES = [
    'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
    'Shravana', 'Bhadrapada', 'Ashwin', 'Kartik',
    'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
]

_FESTIVALS = {
    # Purnimanta system (North Indian): month starts after Purnima.
    # Shukla paksha = same name in both Amanta and Purnimanta.
    # Krishna paksha = Purnimanta name is one month AHEAD of Amanta name.
    # e.g. Amanta Shravana Krishna = Purnimanta Bhadrapada Krishna (Janmashtami).
    #      Amanta Bhadrapada Krishna = Purnimanta Ashwin Krishna (Pitru Paksha).
    #      Amanta Ashwin Krishna = Purnimanta Kartik Krishna (Diwali week).

    # ── Chaitra ───────────────────────────────────────────────────────────
    ('Chaitra', 'Krishna',  8):  'Sheetala Ashtami · Basoda',
    ('Chaitra', 'Shukla',  1):  'Gudi Padwa · Ugadi · Chaitra Navratri Begins',
    ('Chaitra', 'Shukla',  2):  'Chaitra Navratri Day 2',
    ('Chaitra', 'Shukla',  3):  'Chaitra Navratri Day 3 · Saubhagya Teej',
    ('Chaitra', 'Shukla',  4):  'Chaitra Navratri Day 4 · Vinayaka Chaturthi',
    ('Chaitra', 'Shukla',  5):  'Chaitra Navratri Day 5 · Lakshmi Panchami',
    ('Chaitra', 'Shukla',  6):  'Chaitra Navratri Day 6 · Skanda Shashthi',
    ('Chaitra', 'Shukla',  7):  'Chaitra Navratri Day 7 · Chaitra Saptami',
    ('Chaitra', 'Shukla',  8):  'Chaitra Navratri Day 8 · Durgashtami',
    ('Chaitra', 'Shukla',  9):  'Ram Navami · Chaitra Navratri Day 9',
    ('Chaitra', 'Shukla', 13):  'Mahavir Jayanti (approx)',
    ('Chaitra', 'Shukla', 15):  'Hanuman Jayanti · Chaitra Purnima',
    # Chaitra Krishna (Purnimanta) = Amanta Phalguna Krishna
    ('Chaitra', 'Krishna', 15):  'Chaitra Amavasya',
    # ── Vaishakha ─────────────────────────────────────────────────────────
    ('Vaishakha', 'Shukla',  3):  'Akshaya Tritiya · Parashurama Jayanti',
    ('Vaishakha', 'Shukla',  6):  'Shankaracharya Jayanti',
    ('Vaishakha', 'Shukla', 15):  'Buddha Purnima · Vaishakha Purnima',
    # Vaishakha Krishna (Purnimanta) = Amanta Chaitra Krishna
    ('Vaishakha', 'Krishna',  8):  'Sita Ashtami',
    ('Vaishakha', 'Krishna', 15):  'Vaishakha Amavasya',
    # ── Jyeshtha ──────────────────────────────────────────────────────────
    ('Jyeshtha', 'Shukla',  3):  'Shani Jayanti · Vat Savitri Vrat',
    ('Jyeshtha', 'Shukla', 10):  'Ganga Dussehra',
    ('Jyeshtha', 'Shukla', 11):  'Nirjala Ekadashi',
    ('Jyeshtha', 'Shukla', 15):  'Jyeshtha Purnima · Vat Purnima',
    # Jyeshtha Krishna (Purnimanta) = Amanta Vaishakha Krishna
    ('Jyeshtha', 'Krishna', 15):  'Jyeshtha Amavasya',
    # ── Ashadha ───────────────────────────────────────────────────────────
    ('Ashadha', 'Shukla',  2):  'Rath Yatra · Jagannath Rath Yatra',
    ('Ashadha', 'Shukla', 11):  'Devshayani Ekadashi · Chaturmas Begins',
    ('Ashadha', 'Shukla', 15):  'Guru Purnima · Ashadha Purnima',
    # Ashadha Krishna (Purnimanta) = Amanta Jyeshtha Krishna
    ('Ashadha', 'Krishna', 15):  'Ashadha Amavasya',
    # ── Shravana ──────────────────────────────────────────────────────────
    ('Shravana', 'Shukla',  5):  'Nag Panchami',
    ('Shravana', 'Shukla', 11):  'Putrada Ekadashi',
    ('Shravana', 'Shukla', 15):  'Raksha Bandhan · Shravana Purnima · Avani Avittam',
    ('Shravana', 'Shukla',  3):  'Hariyali Teej · Shravana Teej',
    # Shravana Krishna (Purnimanta) = Amanta Ashadha Krishna
    ('Shravana', 'Krishna',  8):  'Kalashtami',
    ('Shravana', 'Krishna', 15):  'Shravana Amavasya',
    # ── Bhadrapada ────────────────────────────────────────────────────────
    ('Bhadrapada', 'Shukla',  3):  'Hartalika Teej',
    ('Bhadrapada', 'Shukla',  4):  'Ganesh Chaturthi · Vinayaka Chaturthi',
    ('Bhadrapada', 'Shukla',  5):  'Rishi Panchami',
    ('Bhadrapada', 'Shukla',  6):  'Skanda Shashthi',
    ('Bhadrapada', 'Shukla',  8):  'Radha Ashtami',
    ('Bhadrapada', 'Shukla', 11):  'Parivartini Ekadashi · Vaman Ekadashi',
    ('Bhadrapada', 'Shukla', 12):  'Vaman Jayanti',
    ('Bhadrapada', 'Shukla', 14):  'Anant Chaturdashi · Ganesh Visarjan',
    ('Bhadrapada', 'Shukla', 15):  'Bhadrapada Purnima',
    # Bhadrapada Krishna (Purnimanta) = Amanta Shravana Krishna
    ('Bhadrapada', 'Krishna',  8):  'Janmashtami · Krishna Janmashtami',
    ('Bhadrapada', 'Krishna', 15):  'Bhadrapada Amavasya · Pithru Amavasya',
    # ── Ashwin ────────────────────────────────────────────────────────────
    ('Ashwin', 'Shukla',  1):  'Sharad Navratri Begins · Ghatasthapana',
    ('Ashwin', 'Shukla',  2):  'Sharad Navratri Day 2',
    ('Ashwin', 'Shukla',  3):  'Sharad Navratri Day 3',
    ('Ashwin', 'Shukla',  4):  'Sharad Navratri Day 4 · Varad Vinayaka',
    ('Ashwin', 'Shukla',  5):  'Sharad Navratri Day 5 · Lalita Panchami',
    ('Ashwin', 'Shukla',  6):  'Sharad Navratri Day 6 · Durga Shashthi',
    ('Ashwin', 'Shukla',  7):  'Sharad Navratri Day 7 · Durga Saptami',
    ('Ashwin', 'Shukla',  8):  'Sharad Navratri Day 8 · Maha Durgashtami',
    ('Ashwin', 'Shukla',  9):  'Maha Navami · Sharad Navratri Day 9',
    ('Ashwin', 'Shukla', 10):  'Dussehra · Vijaya Dashami',
    ('Ashwin', 'Shukla', 11):  'Papankusha Ekadashi',
    ('Ashwin', 'Shukla', 15):  'Sharad Purnima · Kojagara Purnima · Laxmi Puja',
    # Ashwin Krishna (Purnimanta) = Amanta Bhadrapada Krishna = Pitru Paksha
    ('Ashwin', 'Krishna',  1):  'Pitru Paksha Begins',
    ('Ashwin', 'Krishna',  8):  'Janmashtami (some traditions)',
    ('Ashwin', 'Krishna', 15):  'Mahalaya Amavasya · Ashwin Amavasya · Pitru Paksha Ends',
    # ── Kartik ────────────────────────────────────────────────────────────
    ('Kartik', 'Shukla',  1):  'Govardhan Puja · Annakut',
    ('Kartik', 'Shukla',  2):  'Bhai Dooj · Yama Dwithiya',
    ('Kartik', 'Shukla',  6):  'Chhath Puja · Surya Shashthi',
    ('Kartik', 'Shukla',  8):  'Gopa Ashtami',
    ('Kartik', 'Shukla', 11):  'Dev Uthani Ekadashi · Tulsi Vivah · Prabodhini Ekadashi',
    ('Kartik', 'Shukla', 12):  'Tulsi Vivah (alternate)',
    ('Kartik', 'Shukla', 15):  'Kartik Purnima · Dev Diwali · Guru Nanak Jayanti',
    # Kartik Krishna (Purnimanta) = Amanta Ashwin Krishna = Diwali week
    ('Kartik', 'Krishna',  4):  'Karwa Chauth',
    ('Kartik', 'Krishna',  8):  'Ahoi Ashtami',
    ('Kartik', 'Krishna', 13):  'Dhanteras · Dhanvantari Jayanti',
    ('Kartik', 'Krishna', 14):  'Narak Chaturdashi · Choti Diwali · Hanuman Puja',
    ('Kartik', 'Krishna', 15):  'Diwali · Lakshmi Puja · Kartik Amavasya',
    # ── Margashirsha ──────────────────────────────────────────────────────
    ('Margashirsha', 'Shukla',  5):  'Vivah Panchami · Sita Ram Vivah',
    ('Margashirsha', 'Shukla', 11):  'Geeta Jayanti · Mokshada Ekadashi',
    ('Margashirsha', 'Shukla', 15):  'Margashirsha Purnima · Dattatreya Jayanti',
    # Margashirsha Krishna (Purnimanta) = Amanta Kartik Krishna
    ('Margashirsha', 'Krishna', 15):  'Margashirsha Amavasya',
    # ── Pausha ────────────────────────────────────────────────────────────
    ('Pausha', 'Shukla', 15):  'Pausha Purnima · Shakambhari Purnima',
    # Pausha Krishna (Purnimanta) = Amanta Margashirsha Krishna
    ('Pausha', 'Krishna', 15):  'Pausha Amavasya',
    # ── Magha ─────────────────────────────────────────────────────────────
    ('Magha', 'Shukla',  5):  'Vasant Panchami · Saraswati Puja',
    ('Magha', 'Shukla', 15):  'Magha Purnima',
    # Magha Krishna (Purnimanta) = Amanta Pausha Krishna
    ('Magha', 'Krishna',  4):  'Sakat Chauth',
    ('Magha', 'Krishna', 15):  'Mauni Amavasya · Magha Amavasya',
    # ── Phalguna ──────────────────────────────────────────────────────────
    ('Phalguna', 'Shukla', 15):  'Holi · Holika Dahan · Phalguna Purnima',
    # Phalguna Krishna (Purnimanta) = Amanta Magha Krishna
    ('Phalguna', 'Krishna', 14):  'Maha Shivratri',
    ('Phalguna', 'Krishna', 15):  'Phalguna Amavasya',
}


# ── Special Yogas ─────────────────────────────────────────────────────────────

# Gand Mool: Moon in junction nakshatras (Ashwini=0, Ashlesha=8, Magha=9,
#            Jyeshtha=17, Mula=18, Revati=26)
_GAND_MOOL_NAK = {0, 8, 9, 17, 18, 26}

# Sarvaartha Siddhi Yoga: auspicious vara+nakshatra combinations
_SARVAARTHA_SIDDHI: dict[int, set[int]] = {
    0: {0, 7, 11, 12, 20, 25},  # Sun: Ashwini,Pushya,Uttara Phalguni,Hasta,Uttara Ashadha,Uttara Bhadrapada
    1: {3, 4, 7, 16, 21},       # Mon: Rohini,Mrigashira,Pushya,Anuradha,Shravana
    2: {0, 2, 4, 13, 22},       # Tue: Ashwini,Krittika,Mrigashira,Chitra,Dhanishtha
    3: {2, 3, 4, 12, 16},       # Wed: Krittika,Rohini,Mrigashira,Hasta,Anuradha
    4: {0, 6, 7, 16, 26},       # Thu: Ashwini,Punarvasu,Pushya,Anuradha,Revati
    5: {0, 6, 16, 23, 26},      # Fri: Ashwini,Punarvasu,Anuradha,Shatabhisha,Revati
    6: {3, 14, 16, 21, 22},     # Sat: Rohini,Swati,Anuradha,Shravana,Dhanishtha
}

# Amrit Siddhi Yoga: most auspicious vara+nakshatra
_AMRIT_SIDDHI: dict[int, set[int]] = {
    0: {12},   # Sun + Hasta
    1: {4},    # Mon + Mrigashira
    2: {0},    # Tue + Ashwini
    3: {16},   # Wed + Anuradha
    4: {7},    # Thu + Pushya
    5: {26},   # Fri + Revati
    6: {3},    # Sat + Rohini
}

# Dwipushkar Yoga: vara+tithi+nakshatra (rare, very auspicious)
_DWIPUSHKAR_VARA_TITHI: dict[int, set[int]] = {
    0: {2, 7, 12},   # Sun + Dwitiya/Saptami/Dwadashi
    2: {2, 7, 12},   # Tue + same
    6: {2, 7, 12},   # Sat + same
}
_DWIPUSHKAR_NAK = {3, 12, 22}   # Rohini, Hasta, Dhanishtha

def _special_yogas(weekday: int, nak_i: int, tithi_num: int) -> list[str]:
    """Return list of special yoga names for this vara + nakshatra + tithi combo."""
    yogas: list[str] = []
    if nak_i in _GAND_MOOL_NAK:
        yogas.append('Gand Mool')
    if nak_i in _AMRIT_SIDDHI.get(weekday, set()):
        yogas.append('Amrit Siddhi Yoga')
    if nak_i in _SARVAARTHA_SIDDHI.get(weekday, set()):
        yogas.append('Sarvaartha Siddhi Yoga')
    if weekday == 0 and nak_i == 7:
        yogas.append('Ravi Pushya Yoga')
    if weekday == 4 and nak_i == 7:
        yogas.append('Guru Pushya Yoga')
    if weekday in _DWIPUSHKAR_VARA_TITHI and tithi_num in _DWIPUSHKAR_VARA_TITHI[weekday] and nak_i in _DWIPUSHKAR_NAK:
        yogas.append('Dwipushkar Yoga')
    return yogas


def _find_amavasya(jd_guess: float) -> float:
    """Newton-Raphson refinement to find the exact Amavasya nearest jd_guess.

    The synodic month varies from ~29.27 to ~29.83 days, so fixed offsets
    like 29.53 can miss the true conjunction by hours. 8 iterations converge
    to < 0.1 second accuracy.
    """
    jd = jd_guess
    for _ in range(8):
        s = swe.calc_ut(jd, swe.SUN,  swe.FLG_SWIEPH)[0][0]
        m = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH)[0][0]
        # Signed residual: positive = moon ahead of sun (past conjunction)
        residual = (m - s + 180) % 360 - 180
        correction = residual / 12.2  # ~12.2°/day differential speed
        jd -= correction
        if abs(correction) < 1e-6:  # < 0.1 second
            break
    return jd


def _get_masa(jd: float) -> str:
    sun_lon      = swe.calc_ut(jd, swe.SUN,  swe.FLG_SWIEPH)[0][0]
    moon_lon     = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH)[0][0]
    ayanamsha    = swe.get_ayanamsa_ut(jd)
    sun_sidereal = (sun_lon - ayanamsha) % 360
    sun_sign     = int(sun_sidereal // 30)
    moon_sun_diff = (moon_lon - sun_lon) % 360

    # Find the EXACT last Amavasya using Newton-Raphson
    jd_av      = _find_amavasya(jd - moon_sun_diff / 12.2)
    sun_at_av  = swe.calc_ut(jd_av, swe.SUN, swe.FLG_SWIEPH)[0][0]
    ay_av      = swe.get_ayanamsa_ut(jd_av)
    sign_at_av = int(((sun_at_av - ay_av) % 360) / 30)

    # Find the EXACT next Amavasya (use mean synodic month as starting guess only)
    jd_next_av      = _find_amavasya(jd_av + 29.53)
    sun_at_next_av  = swe.calc_ut(jd_next_av, swe.SUN, swe.FLG_SWIEPH)[0][0]
    ay_next_av      = swe.get_ayanamsa_ut(jd_next_av)
    sign_at_next_av = int(((sun_at_next_av - ay_next_av) % 360) / 30)

    tithi_i_now = int(moon_sun_diff / 12)
    is_adhika   = (sign_at_av == sign_at_next_av)

    if is_adhika:
        # Adhika month Shukla paksha → 'Adhika X'
        # Adhika month Krishna paksha → Purnimanta considers the Nija month started
        if tithi_i_now >= 15:
            return _MASA_NAMES[(sign_at_av + 1) % 12]
        return 'Adhika ' + _MASA_NAMES[(sign_at_av + 1) % 12]

    # Purnimanta system (North Indian): during Krishna paksha the month name
    # is one ahead of the Amanta name — the new month starts at Purnima, not Amavasya.
    if tithi_i_now >= 15:
        return _MASA_NAMES[(sign_at_av + 2) % 12]

    return _MASA_NAMES[(sign_at_av + 1) % 12]


def _get_festival(masa: str, paksha: str, tithi_num: int) -> str:
    # tithi_num is 1-30 overall; _FESTIVALS keys use 1-15 within each paksha
    lookup_num = (tithi_num - 15) if tithi_num > 15 else tithi_num
    fest = _FESTIVALS.get((masa, paksha, lookup_num), '')
    # Ekadashi: Shukla 11 = tithi 11, Krishna 11 = tithi 26
    if tithi_num in (11, 26):
        fest = (fest + ' · Ekadashi') if fest else 'Ekadashi'
    # Purnima: Shukla 15 = tithi 15
    if tithi_num == 15 and 'Purnima' not in fest:
        fest = (fest + ' · Purnima') if fest else 'Purnima'
    # Amavasya: Krishna 15 = tithi 30
    if tithi_num == 30 and 'Amavasya' not in fest:
        fest = (fest + ' · Amavasya') if fest else 'Amavasya'
    return fest


# ── Helpers ──────────────────────────────────────────────────────────────────

def _local_to_jd(date_str: str, hour: float, tz_str: str) -> float:
    d = date_cls.fromisoformat(date_str)
    tz  = pytz.timezone(tz_str)
    h   = int(hour)
    m   = int((hour - h) * 60)
    dt  = tz.localize(datetime(d.year, d.month, d.day, h, m))
    utc = dt.astimezone(pytz.utc)
    return swe.julday(utc.year, utc.month, utc.day,
                      utc.hour + utc.minute/60.0 + utc.second/3600.0)


def _jd_to_local(jd: float, tz_str: str) -> datetime:
    y, mo, d, h = swe.revjul(jd)
    h_i = int(h); m_i = int((h - h_i)*60); s_i = int(((h - h_i)*60 - m_i)*60)
    dt_utc = datetime(y, mo, int(d), h_i, m_i, s_i, tzinfo=pytz.utc)
    return dt_utc.astimezone(pytz.timezone(tz_str))


def _fmt(jd: float, tz_str: str) -> str:
    return _jd_to_local(jd, tz_str).strftime('%H:%M')


def _sidereal(jd: float, planet_id: int) -> float:
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    pos, _ = swe.calc_ut(jd, planet_id, flags)
    return pos[0] % 360


def _rise_set(jd_search: float, body: int, flag: int, lat: float, lon: float) -> float:
    geopos = (lon, lat, 0.0)
    ret, tret = swe.rise_trans(jd_search, body, flag, geopos, 1013.0, 15.0)
    return tret[0]


def _weekday(jd: float, tz_str: str) -> int:
    """0=Sun … 6=Sat"""
    dt = _jd_to_local(jd, tz_str)
    return (dt.weekday() + 1) % 7


def _now_jd() -> float:
    utc = datetime.utcnow()
    return swe.julday(utc.year, utc.month, utc.day,
                      utc.hour + utc.minute/60.0 + utc.second/3600.0)


def _crossed(prev: float, curr: float, boundary: float) -> bool:
    """True if a monotonically increasing circular value crossed boundary between prev and curr."""
    if prev <= boundary < curr:
        return True
    # Handle wrap at 360
    if prev > curr and (prev <= boundary or boundary < curr):
        return True
    return False


def _tithi_end(jd_sr: float, tithi_i: int, tz_str: str) -> str:
    boundary = ((tithi_i + 1) * 12.0) % 360.0
    jd   = jd_sr
    step = 1.0 / 96  # 15-min steps
    prev = (_sidereal(jd, swe.MOON) - _sidereal(jd, swe.SUN)) % 360.0
    for _ in range(200):  # up to ~50 hours
        jd += step
        curr = (_sidereal(jd, swe.MOON) - _sidereal(jd, swe.SUN)) % 360.0
        if _crossed(prev, curr, boundary):
            return _fmt(jd, tz_str)
        prev = curr
    return '–'


def _nakshatra_end(jd_sr: float, nak_i: int, tz_str: str) -> str:
    boundary = ((nak_i + 1) * (360.0 / 27)) % 360.0
    jd   = jd_sr
    step = 1.0 / 96
    prev = _sidereal(jd, swe.MOON)
    for _ in range(200):
        jd += step
        curr = _sidereal(jd, swe.MOON)
        if _crossed(prev, curr, boundary):
            return _fmt(jd, tz_str)
        prev = curr
    return '–'


def _kalam_times(jd_sr: float, jd_ss: float, weekday: int, tz: str) -> dict:
    slot_dur = (jd_ss - jd_sr) / 8

    def _slot(n: int) -> dict:  # n is 1-indexed
        s = jd_sr + (n - 1) * slot_dur
        e = jd_sr + n * slot_dur
        return {'start': _fmt(s, tz), 'end': _fmt(e, tz), 'jd_start': s, 'jd_end': e}

    return {
        'rahu_kalam': _slot(RAHU_KALAM_SLOT[weekday]),
        'yamaganda':  _slot(YAMAGANDA_SLOT[weekday]),
        'gulikai':    _slot(GULIKAI_SLOT[weekday]),
    }


# ── Core calculation ──────────────────────────────────────────────────────────

def calculate_panchang(date_str: str, lat: float, lon: float, tz_str: str) -> dict:
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    jd_noon    = _local_to_jd(date_str, 12.0, tz_str)
    jd_sr      = _rise_set(jd_noon - 0.5, swe.SUN,  swe.CALC_RISE, lat, lon)
    jd_ss      = _rise_set(jd_noon,       swe.SUN,  swe.CALC_SET,  lat, lon)
    jd_next_sr = _rise_set(jd_noon + 0.5, swe.SUN,  swe.CALC_RISE, lat, lon)
    jd_mr      = _rise_set(jd_noon - 0.5, swe.MOON, swe.CALC_RISE, lat, lon)

    weekday  = _weekday(jd_sr, tz_str)
    sun_sid  = _sidereal(jd_sr, swe.SUN)
    moon_sid = _sidereal(jd_sr, swe.MOON)

    # Tithi
    diff    = (moon_sid - sun_sid) % 360
    tithi_i = int(diff / 12)
    paksha  = 'Shukla' if tithi_i < 15 else 'Krishna'

    # Nakshatra
    nak_deg  = 360.0 / 27
    nak_i    = int(moon_sid / nak_deg)
    nak_pada = int((moon_sid % nak_deg) / (nak_deg / 4)) + 1

    # Yoga
    yoga_i = int(((sun_sid + moon_sid) % 360) / (360.0 / 27))

    # Karana
    kar_i = int(diff / 6)
    if kar_i == 0:
        karana = 'Kimstughna'
    elif kar_i == 57:
        karana = 'Shakuni'
    elif kar_i == 58:
        karana = 'Chatushpada'
    elif kar_i == 59:
        karana = 'Naga'
    else:
        karana = KARANA_MOVABLE[(kar_i - 1) % 7]

    # End times
    tithi_end = _tithi_end(jd_sr, tithi_i, tz_str)
    nak_end   = _nakshatra_end(jd_sr, nak_i, tz_str)

    # Kalams
    kalams    = _kalam_times(jd_sr, jd_ss, weekday, tz_str)

    # Choghadiya
    day_chog   = _choghadiya(jd_sr,  jd_ss,      weekday, day=True,  tz=tz_str, kalams=kalams)
    night_chog = _choghadiya(jd_ss,  jd_next_sr, weekday, day=False, tz=tz_str)

    # Hora & Vedic time
    hora       = _hora(jd_sr, weekday, tz_str)
    vedic_time = _vedic_time(jd_sr, jd_ss, tz_str)

    # Auspicious timings
    solar_noon    = (jd_sr + jd_ss) / 2
    brahma_start  = _fmt(jd_sr - 96.0 / 1440, tz_str)
    brahma_end    = _fmt(jd_sr - 48.0 / 1440, tz_str)
    # Abhijit Muhurta is not observed on Wednesday (Budhvaar) — traditional rule
    if weekday == 3:  # Wednesday
        abhijit_start = None
        abhijit_end   = None
    else:
        abhijit_start = _fmt(solar_noon - 24.0 / 1440, tz_str)
        abhijit_end   = _fmt(solar_noon + 24.0 / 1440, tz_str)
    godhuli_start = _fmt(jd_ss - 12.0 / 1440, tz_str)
    godhuli_end   = _fmt(jd_ss + 12.0 / 1440, tz_str)

    # Day/night duration
    day_min   = int(round((jd_ss - jd_sr) * 24 * 60))
    night_min = int(round((jd_next_sr - jd_ss) * 24 * 60))

    # Samvat, Ritu, Ayana
    d = date_cls.fromisoformat(date_str)
    vs    = d.year + 57 if d.month <= 3 else d.year + 56
    shaka = d.year - 78 if d.month >= 4 else d.year - 79
    ritu  = RITU_NAMES[int(sun_sid / 60) % 6]
    ayana = 'Uttarayana' if (sun_sid < 90 or sun_sid >= 270) else 'Dakshinayana'

    masa = _get_masa(jd_sr)

    # Festival (with kshaya tithi detection)
    festival = _get_festival(masa, paksha, tithi_i + 1)
    diff_next  = (_sidereal(jd_next_sr, swe.MOON) - _sidereal(jd_next_sr, swe.SUN)) % 360
    tithi_next = int(diff_next / 12)
    gap = (tithi_next - tithi_i) % 30
    if gap > 1:
        ksh_i      = (tithi_i + 1) % 30
        ksh_paksha = 'Shukla' if ksh_i < 15 else 'Krishna'
        ksh_num    = ksh_i + 1 if ksh_i < 15 else ksh_i - 14
        ksh_num_30 = ksh_num if ksh_paksha == 'Shukla' else ksh_num + 15
        ksh_fest   = _get_festival(masa, ksh_paksha, ksh_num_30)
        if ksh_fest:
            festival = (festival + ' · ' + ksh_fest) if festival else ksh_fest
    sun_sid_noon = _sidereal(jd_noon, swe.SUN)
    sun_sid_prev = _sidereal(jd_noon - 1.0, swe.SUN)
    _SANKRANTI = [
        (  0, 'Mesha Sankranti · Baisakhi · Vishu · Puthandu'),
        ( 30, 'Vrishabha Sankranti'),
        ( 60, 'Mithuna Sankranti'),
        ( 90, 'Karka Sankranti · Dakshinayan Begins'),
        (120, 'Simha Sankranti'),
        (150, 'Kanya Sankranti'),
        (180, 'Tula Sankranti'),
        (210, 'Vrischika Sankranti'),
        (240, 'Dhanu Sankranti'),
        (270, 'Makar Sankranti · Pongal · Lohri · Uttarayan'),
        (300, 'Kumbha Sankranti'),
        (330, 'Meena Sankranti'),
    ]
    for deg, name in _SANKRANTI:
        if sun_sid_prev < deg <= sun_sid_noon or (sun_sid_prev > deg + 30 and sun_sid_noon < deg + 5):
            festival = (festival + ' · ' + name) if festival else name
            break

    # Special yogas
    special_yogas = _special_yogas(weekday, nak_i, tithi_i + 1)

    return {
        'date': date_str,
        'masa': masa,
        'vara': {'name': VARA[weekday], 'name_hi': VARA_HI[weekday], 'lord': VARA_LORD[weekday]},
        'tithi': {
            'name': TITHI[tithi_i], 'number': tithi_i + 1,
            'paksha': paksha, 'end_time': tithi_end,
        },
        'nakshatra': {
            'name': NAKSHATRA[nak_i], 'name_hi': NAKSHATRA_HI[nak_i],
            'pada': nak_pada, 'end_time': nak_end,
        },
        'yoga':    {'name': YOGA[yoga_i], 'number': yoga_i + 1},
        'karana':  {'name': karana},
        'sunrise':  _fmt(jd_sr, tz_str),
        'sunset':   _fmt(jd_ss, tz_str),
        'moonrise': _fmt(jd_mr, tz_str),
        'choghadiya': {'day': day_chog, 'night': night_chog},
        'hora':       hora,
        'vedic_time': vedic_time,
        'kalams': {
            'rahu_kalam': {'start': kalams['rahu_kalam']['start'], 'end': kalams['rahu_kalam']['end']},
            'yamaganda':  {'start': kalams['yamaganda']['start'],  'end': kalams['yamaganda']['end']},
            'gulikai':    {'start': kalams['gulikai']['start'],    'end': kalams['gulikai']['end']},
        },
        'auspicious': {
            'brahma_muhurta':  {'start': brahma_start,  'end': brahma_end},
            'abhijit_muhurta': {'start': abhijit_start, 'end': abhijit_end},
            'godhuli_muhurta': {'start': godhuli_start, 'end': godhuli_end},
        },
        'samvat':    {'vikram': vs, 'shaka': shaka},
        'ritu':          ritu,
        'ayana':         ayana,
        'dinamana':      f"{day_min // 60}h {day_min % 60:02d}m",
        'ratrimana':     f"{night_min // 60}h {night_min % 60:02d}m",
        'festival':      festival,
        'special_yogas': special_yogas,
    }


def _choghadiya(jd_start: float, jd_end: float, weekday: int,
                day: bool, tz: str, kalams: dict = None) -> list:
    dur    = (jd_end - jd_start) / 8
    start  = DAY_CHOG_START[weekday] if day else NIGHT_CHOG_START[weekday]
    now_jd = _now_jd()
    slots  = []
    for i in range(8):
        s    = jd_start + i * dur
        e    = jd_start + (i + 1) * dur
        # Day: forward +1 through Chaldean order; Night: reverse -2 (Drik Panchang standard)
        name = CHOG_NAMES[(start + i) % 7] if day else CHOG_NAMES[(start - 2 * i) % 7]
        slot_num = i + 1  # 1-indexed
        overlaps = []
        if kalams and day:
            for kname, k in kalams.items():
                if s < k['jd_end'] and e > k['jd_start']:
                    overlaps.append(kname)
        if day:
            if slot_num == KAAL_VELA_SLOT[weekday]:
                overlaps.append('kaal_vela')
            if slot_num == VAAR_VELA_SLOT[weekday]:
                overlaps.append('vaar_vela')
        else:
            if slot_num == KAAL_RATRI_SLOT[weekday]:
                overlaps.append('kaal_ratri')
        slots.append({
            'name':     name,
            'nature':   CHOG_NATURE[name],
            'start':    _fmt(s, tz),
            'end':      _fmt(e, tz),
            'active':   s <= now_jd < e,
            'overlaps': overlaps,
        })
    return slots


def _hora(jd_sr: float, weekday: int, tz: str) -> list:
    start  = HORA_DAY_START[weekday]
    now_jd = _now_jd()
    slots  = []
    for i in range(24):
        s      = jd_sr + i / 24.0
        e      = jd_sr + (i + 1) / 24.0
        planet = HORA_PLANETS[(start + i) % 7]
        slots.append({
            'hour':   i + 1,
            'planet': planet,
            'start':  _fmt(s, tz),
            'end':    _fmt(e, tz),
            'active': s <= now_jd < e,
        })
    return slots


def _vedic_time(jd_sr: float, jd_ss: float, tz: str) -> dict:
    now_jd      = _now_jd()
    day_dur_jd  = jd_ss - jd_sr
    night_dur_jd = 1.0 - day_dur_jd  # full day minus daytime

    is_day           = jd_sr <= now_jd <= jd_ss
    ghati_mins       = round((day_dur_jd   * 24 * 60) / 30, 1)
    night_ghati_mins = round((night_dur_jd * 24 * 60) / 30, 1)

    # Dynamic 30+30 system: 30 Ghati day + 30 Ghati night = 60 total
    if is_day:
        ghati_f = ((now_jd - jd_sr) / day_dur_jd) * 30
    elif now_jd > jd_ss:
        ghati_f = 30 + ((now_jd - jd_ss) / night_dur_jd) * 30
    else:
        # Before sunrise: continuation of previous night
        ghati_f = 30 + ((now_jd - jd_ss + 1.0) / night_dur_jd) * 30

    ghati       = int(ghati_f)
    pala_f   = (ghati_f - ghati) * 60
    pala     = int(pala_f)
    vipala   = int((pala_f - pala) * 60)

    return {
        'ghati':  ghati,
        'pala':   pala,
        'vipala': vipala,
        'is_day': is_day,
        'ghati_duration_min':       ghati_mins,
        'night_ghati_duration_min': night_ghati_mins,
        'sunrise': _fmt(jd_sr, tz),
        'sunset':  _fmt(jd_ss, tz),
    }


# ── Monthly Panchang ──────────────────────────────────────────────────────────

# Auspicious tithis (1-indexed) per activity
_GOOD_TITHIS = {
    "marriage":  {2,3,5,7,10,11,13},
    "business":  {1,2,3,5,7,10,11,13},
    "travel":    {2,3,5,7,10,11,12},
    "medical":   {2,3,5,7,10,11},
    "purchase":  {2,3,5,7,10,11,13},
    "education": {2,3,5,7,10,11,12},
}

# Auspicious vara (0=Sun…6=Sat) per activity
_GOOD_VARA = {
    "marriage":  {1,3,4,5},   # Mon,Wed,Thu,Fri
    "business":  {1,3,4,5},
    "travel":    {1,3,4},
    "medical":   {1,3,4},
    "purchase":  {1,3,4,5},
    "education": {3,4,5},
}

# Auspicious nakshatras (0-indexed) per activity
_GOOD_NAK = {
    "marriage":  {3,4,9,11,12,14,16,18,20,25,26},
    "business":  {3,4,6,7,12,13,14,16,26,0},
    "travel":    {0,4,6,7,12,13,14,16,17,21,22,26},
    "medical":   {0,3,4,6,7,12,14,16,17,26},
    "purchase":  {3,6,7,11,12,13,14,15,16,20,21,25,26},
    "education": {4,6,7,12,13,14,16,17,21,26},
}

# Bad yogas (0-indexed)
_BAD_YOGA = {0, 5, 8, 9, 13, 16, 18, 26}  # Vishkambha,Atiganda,Shula,Ganda,Vajra,Vyatipata,Parigha,Vaidhriti

# Good choghadiya for any activity
_GOOD_CHOG = {"Amrita", "Shubha", "Labha"}


def _quick_day(date_str: str, lat: float, lon: float, tz_str: str) -> dict | None:
    """Lightweight daily panchang — tithi/nakshatra/yoga/sunrise + masa/festival/rahu."""
    try:
        jd_noon = _local_to_jd(date_str, 12.0, tz_str)
        jd_sr   = _rise_set(jd_noon - 0.5, swe.SUN, swe.CALC_RISE, lat, lon)
        jd_ss   = _rise_set(jd_noon,       swe.SUN, swe.CALC_SET,  lat, lon)
        weekday = _weekday(jd_sr, tz_str)
        sun_sid  = _sidereal(jd_sr, swe.SUN)
        moon_sid = _sidereal(jd_sr, swe.MOON)
        diff     = (moon_sid - sun_sid) % 360
        tithi_i  = int(diff / 12)
        nak_i    = int(moon_sid / (360 / 27))
        yoga_i   = int(((sun_sid + moon_sid) % 360) / (360 / 27))
        paksha   = 'Shukla' if tithi_i < 15 else 'Krishna'
        masa     = _get_masa(jd_sr)
        festival = _get_festival(masa, paksha, tithi_i + 1)

        # ── Kshaya tithi detection ──────────────────────────────────────────
        # If a tithi starts AND ends within today (between this sunrise and
        # the next), it is a kshaya (skipped) tithi — both tithis count today.
        jd_next_sr = _rise_set(jd_noon + 0.5, swe.SUN, swe.CALC_RISE, lat, lon)
        diff_next   = (_sidereal(jd_next_sr, swe.MOON) - _sidereal(jd_next_sr, swe.SUN)) % 360
        tithi_next  = int(diff_next / 12)
        gap = (tithi_next - tithi_i) % 30   # normally 1; >1 means a tithi was skipped
        if gap > 1:
            ksh_i      = (tithi_i + 1) % 30
            ksh_paksha = 'Shukla' if ksh_i < 15 else 'Krishna'
            ksh_num    = ksh_i + 1 if ksh_i < 15 else ksh_i - 14
            ksh_num_30 = ksh_num if ksh_paksha == 'Shukla' else ksh_num + 15
            ksh_fest   = _get_festival(masa, ksh_paksha, ksh_num_30)
            if ksh_fest:
                festival = (festival + ' · ' + ksh_fest) if festival else ksh_fest

        # Solar festivals — all 12 Sankrantis
        sun_sid_noon  = _sidereal(jd_noon, swe.SUN)
        sun_sid_prev  = _sidereal(jd_noon - 1.0, swe.SUN)
        _SKT = [
            (  0, 'Mesha Sankranti · Baisakhi · Vishu · Puthandu'),
            ( 30, 'Vrishabha Sankranti'), ( 60, 'Mithuna Sankranti'),
            ( 90, 'Karka Sankranti · Dakshinayan Begins'),
            (120, 'Simha Sankranti'), (150, 'Kanya Sankranti'),
            (180, 'Tula Sankranti'), (210, 'Vrischika Sankranti'),
            (240, 'Dhanu Sankranti'),
            (270, 'Makar Sankranti · Pongal · Lohri · Uttarayan'),
            (300, 'Kumbha Sankranti'), (330, 'Meena Sankranti'),
        ]
        for deg, name in _SKT:
            if sun_sid_prev < deg <= sun_sid_noon or (sun_sid_prev > deg + 30 and sun_sid_noon < deg + 5):
                festival = (festival + ' · ' + name) if festival else name
                break
        # ── Onam (Thiruonam) — Moon in Shravana nakshatra while Sun in Leo ────
        if nak_i == 21 and int(sun_sid / 30) == 4:  # Shravana nak + Sun in Simha
            festival = (festival + ' · Onam · Thiruonam') if festival else 'Onam · Thiruonam'
        # ── Pradosh correction for Diwali ──────────────────────────────────────
        # Traditional rule: Diwali (Lakshmi Puja) is observed on the day when
        # Amavasya is present at Pradosh Kaal (~45 min after sunset), NOT the
        # day when Amavasya is at sunrise. When Amavasya begins after sunrise
        # but before Pradosh (as in 2026), the sunrise-tithi rule places Diwali
        # a day late. This block corrects that.
        _masa_base = masa.replace('Adhika ', '').strip()
        if _masa_base == 'Kartik':
            _jd_pradosh      = jd_ss + 45.0 / 1440
            _diff_p          = (_sidereal(_jd_pradosh, swe.MOON) - _sidereal(_jd_pradosh, swe.SUN)) % 360
            _amavasya_pradosh = (int(_diff_p / 12) == 29)   # 29 = 0-indexed = Amavasya

            _DIWALI_STR = 'Diwali · Lakshmi Puja · Kartik Amavasya'
            # Check for 'Diwali' as an exact festival part (not substring of 'Choti Diwali')
            _fest_parts     = set(p.strip() for p in (festival or '').split(' · '))
            _has_main_diwali = 'Diwali' in _fest_parts

            if _amavasya_pradosh and not _has_main_diwali:
                # Amavasya begins today (after sunrise, before Pradosh) → Diwali tonight
                festival = (festival + ' · ' + _DIWALI_STR) if festival else _DIWALI_STR
            elif not _amavasya_pradosh and _has_main_diwali:
                # Amavasya at sunrise but not at Pradosh → Diwali was yesterday; strip here
                festival = festival.replace(' · ' + _DIWALI_STR, '')
                festival = festival.replace(_DIWALI_STR + ' · ', '')
                festival = festival.replace(_DIWALI_STR, '').strip(' ·').strip()

        # Special yogas (vara + nakshatra + tithi)
        special_yogas = _special_yogas(weekday, nak_i, tithi_i + 1)
        kalams   = _kalam_times(jd_sr, jd_ss, weekday, tz_str)
        return {
            "date": date_str,
            "weekday": weekday,
            "day_of_week": VARA[weekday],
            "day_of_week_hi": VARA_HI[weekday],
            "vara": VARA[weekday],
            "tithi": TITHI[tithi_i],
            "tithi_num": tithi_i + 1,
            "paksha": paksha,
            "nakshatra": NAKSHATRA[nak_i],
            "nakshatra_hi": NAKSHATRA_HI[nak_i],
            "nakshatra_idx": nak_i,
            "yoga": YOGA[yoga_i],
            "yoga_idx": yoga_i,
            "sunrise": _fmt(jd_sr, tz_str),
            "masa": masa,
            "festival": festival,
            "special_yogas": special_yogas,
            "rahu_start": kalams['rahu_kalam']['start'],
            "rahu_end":   kalams['rahu_kalam']['end'],
            "jd_sr": jd_sr,
            "jd_ss": jd_ss,
        }
    except Exception:
        return None


def calculate_monthly_panchang(year: int, month: int, lat: float, lon: float, tz_str: str) -> list:
    import calendar
    from datetime import date as date_cls
    today_str = date_cls.today().isoformat()
    days_in_month = calendar.monthrange(year, month)[1]
    result = []
    for day in range(1, days_in_month + 1):
        d_str = f"{year:04d}-{month:02d}-{day:02d}"
        info = _quick_day(d_str, lat, lon, tz_str)
        if info is None:
            continue
        # General auspiciousness: good tithi + good vara + not bad yoga
        tithi_ok = info["tithi_num"] in {2,3,5,7,10,11,13}
        vara_ok  = info["weekday"] in {1,3,4,5}
        yoga_ok  = info["yoga_idx"] not in _BAD_YOGA
        info["is_today"] = d_str == today_str
        info["is_auspicious"] = tithi_ok and vara_ok and yoga_ok
        result.append(info)
    return result


# ── Muhurta Finder ────────────────────────────────────────────────────────────

def find_muhurta(activity: str, date_from: str, date_to: str, lat: float, lon: float, tz_str: str) -> list:
    from datetime import date as date_cls, timedelta as td
    activity = activity.lower()
    good_tithis = _GOOD_TITHIS.get(activity, _GOOD_TITHIS["business"])
    good_vara   = _GOOD_VARA.get(activity, _GOOD_VARA["business"])
    good_nak    = _GOOD_NAK.get(activity, _GOOD_NAK["business"])

    d_from = date_cls.fromisoformat(date_from)
    d_to   = date_cls.fromisoformat(date_to)
    results = []
    d = d_from
    while d <= d_to and len(results) < 10:
        d_str = d.isoformat()
        info = _quick_day(d_str, lat, lon, tz_str)
        if info is None:
            d += td(days=1)
            continue
        score = 0
        reasons = []

        if info["tithi_num"] in good_tithis:
            score += 2
            reasons.append(f"{info['tithi']} tithi (auspicious)")
        if info["weekday"] in good_vara:
            score += 2
            reasons.append(f"{info['day_of_week']} (auspicious day)")
        if info["nakshatra_idx"] in good_nak:
            score += 2
            reasons.append(f"{info['nakshatra']} nakshatra (auspicious)")
        if info["yoga_idx"] not in _BAD_YOGA:
            score += 1
            reasons.append(f"{info['yoga']} yoga (favourable)")

        if score >= 5:
            # Find best choghadiya window
            try:
                kalams = _kalam_times(info["jd_sr"], info["jd_ss"], info["weekday"], tz_str)
                day_chog = _choghadiya(info["jd_sr"], info["jd_ss"], info["weekday"], day=True, tz=tz_str, kalams=kalams)
                best_slot = next((c for c in day_chog if c["name"] in _GOOD_CHOG), None)
                quality = "excellent" if score >= 7 else "good"
                results.append({
                    "date": d_str,
                    "day_of_week": info["day_of_week"],
                    "time_from": best_slot["start"] if best_slot else info["sunrise"],
                    "time_to":   best_slot["end"]   if best_slot else "",
                    "choghadiya": best_slot["name"]  if best_slot else "Amrit",
                    "tithi": info["tithi"],
                    "nakshatra": info["nakshatra"],
                    "quality": quality,
                    "score": score,
                    "reasons": reasons,
                })
            except Exception:
                pass
        d += td(days=1)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:7]


# ── Samskara Muhurta (North Indian tradition) ─────────────────────────────────

_SAMSKARA_VARA_GOOD   = {1, 3, 4, 5}          # Mon, Wed, Thu, Fri
_SAMSKARA_TITHI_AVOID = {4, 8, 9, 14, 15, 19, 23, 24, 29, 30}  # Rikta+Ashtami+Chaturdashi+Purnima+Amavasya both pakshas
_SAMSKARA_NAK_GOOD    = {0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 25, 26}
# Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, U.Phalguni, Hasta, Chitra,
# Swati, Anuradha, U.Ashadha, Shravana, Dhanishtha, U.Bhadrapada, Revati
_SAMSKARA_NAK_AVOID   = {1, 5, 8, 9, 10, 17, 18, 19, 24}
# Bharani, Ardra, Ashlesha, Magha, P.Phalguni, Jyeshtha, Mula, P.Ashadha, P.Bhadrapada
_SAMSKARA_NAK_FIXED   = {3, 11, 20, 25}       # Rohini, U.Phalguni, U.Ashadha, U.Bhadrapada — preferred for Mundan
_MUNDAN_MASA_AVOID    = {'Ashadha', 'Bhadrapada'}


def find_samskara_muhurta(
    baby_dob: str, gender: str, ceremony: str,
    lat: float, lon: float, tz_str: str,
    days_ahead: int = 90,
) -> dict:
    from datetime import date as date_cls, timedelta as td

    baby_d = date_cls.fromisoformat(baby_dob)
    today  = date_cls.today()

    # ── Eligible age window ───────────────────────────────────────────────────
    if ceremony == 'annaprashan':
        if gender == 'girl':
            win_s = baby_d + td(days=120)   # 5th month start
            win_e = baby_d + td(days=180)   # end of 6th month
        else:
            win_s = baby_d + td(days=150)   # 6th month start
            win_e = baby_d + td(days=210)   # end of 7th month
    else:  # mundan: year 1 or year 3
        y1_s, y1_e = baby_d, baby_d + td(days=365)
        y3_s, y3_e = baby_d + td(days=730), baby_d + td(days=1095)
        if y1_e >= today:
            win_s, win_e = y1_s, y1_e
        elif y3_e >= today:
            win_s, win_e = y3_s, y3_e
        else:
            win_s = win_e = today  # both passed — search freely

    # Intersect eligible window with search horizon
    search_s = max(today, win_s)
    search_e = min(win_s + td(days=days_ahead), win_e)
    if search_s > search_e:
        search_s, search_e = today, today + td(days=days_ahead)

    results = []
    d = search_s
    while d <= search_e:
        d_str = d.isoformat()
        info  = _quick_day(d_str, lat, lon, tz_str)
        if info is None:
            d += td(days=1)
            continue

        weekday   = info['weekday']
        tithi_num = info['tithi_num']
        nak_i     = info['nakshatra_idx']
        masa      = info['masa']
        paksha    = info['paksha']

        # ── Hard filters ─────────────────────────────────────────────────────
        if weekday not in _SAMSKARA_VARA_GOOD:
            d += td(days=1); continue
        if tithi_num in _SAMSKARA_TITHI_AVOID:
            d += td(days=1); continue
        if nak_i in _SAMSKARA_NAK_AVOID:
            d += td(days=1); continue
        if ceremony == 'mundan' and masa in _MUNDAN_MASA_AVOID:
            d += td(days=1); continue

        # ── Scoring ──────────────────────────────────────────────────────────
        score = 0
        if nak_i in _SAMSKARA_NAK_GOOD:
            score += 3
            if ceremony == 'mundan' and nak_i in _SAMSKARA_NAK_FIXED:
                score += 1
        if paksha == 'Shukla':
            score += 2
        if weekday in {3, 4}:
            score += 1

        # ── Good choghadiya windows (skip Rahu/Gulikai/Kaal Vela) ────────────
        try:
            kalams   = _kalam_times(info['jd_sr'], info['jd_ss'], weekday, tz_str)
            day_chog = _choghadiya(info['jd_sr'], info['jd_ss'], weekday, day=True, tz=tz_str, kalams=kalams)
            good_windows = [
                c for c in day_chog
                if c['name'] in _GOOD_CHOG
                and not any(o in ('rahu_kalam', 'yamaganda', 'gulikai', 'kaal_vela') for o in c.get('overlaps', []))
            ]
        except Exception:
            good_windows = []

        if score >= 2:
            rating = 'excellent' if score >= 6 else 'good' if score >= 4 else 'acceptable'
            results.append({
                'date':         d_str,
                'vara':         info['day_of_week'],
                'tithi':        info['tithi'],
                'tithi_num':    tithi_num,
                'paksha':       paksha,
                'nakshatra':    info['nakshatra'],
                'nakshatra_hi': info['nakshatra_hi'],
                'nak_rating':   'best' if nak_i in _SAMSKARA_NAK_GOOD else 'neutral',
                'fixed_nak':    nak_i in _SAMSKARA_NAK_FIXED,
                'masa':         masa,
                'windows':      good_windows,
                'score':        score,
                'rating':       rating,
            })
        d += td(days=1)

    results.sort(key=lambda x: x['score'], reverse=True)
    return {
        'eligible_start': search_s.isoformat(),
        'eligible_end':   search_e.isoformat(),
        'results':        results[:20],
    }


# ── Festival Puja Timings ─────────────────────────────────────────────────────

# Maps a keyword (must appear in the festival string) → list of (rule, label) pairs.
# Rules: pratah, madhyahna, aparahna, sandhya, pradosh, nishita, abhijit, moonrise
_PUJA_RULES: list[tuple[str, list[tuple[str, str]]]] = [
    # ── Diwali week ──────────────────────────────────────────────────────────
    ('Diwali',               [('pradosh',   'Lakshmi Puja — Pradosh Kaal'),
                              ('nishita',   'Lakshmi Puja — Nishita Kaal (Midnight)')]),
    ('Dhanteras',            [('pradosh',   'Dhanvantari Puja — Pradosh Kaal'),
                              ('sandhya',   'Yama Deep Daan — Sandhya Kaal')]),
    ('Narak Chaturdashi',    [('pratah',    'Abhyang Snan — before Sunrise')]),
    ('Govardhan Puja',       [('pratah',    'Pratah Puja — Pratah Kaal'),
                              ('aparahna',  'Annakut Darshan — Aparahna Kaal')]),
    ('Bhai Dooj',            [('madhyahna', 'Tilak Ceremony — Madhyahna Kaal'),
                              ('aparahna',  'Tilak Ceremony — Aparahna Kaal')]),
    # ── Holi ─────────────────────────────────────────────────────────────────
    ('Holika Dahan',         [('pradosh',   'Holika Dahan — Pradosh Kaal'),
                              ('nishita',   'Holika Dahan — Nishita Kaal')]),
    # ── Janmashtami ──────────────────────────────────────────────────────────
    ('Janmashtami',          [('nishita',   'Krishna Janma — Nishita Kaal (Midnight)'),
                              ('aparahna',  'Puja & Bhog — Aparahna Kaal')]),
    # ── Maha Shivratri (4 night praharas) ────────────────────────────────────
    ('Maha Shivratri',       [('prahara1',  'Pratham Prahara Puja — 1st Watch'),
                              ('prahara2',  'Dwitiya Prahara Puja — 2nd Watch'),
                              ('prahara3',  'Tritiya Prahara Puja — 3rd Watch'),
                              ('prahara4',  'Chaturthi Prahara Puja — 4th Watch')]),
    # ── Ram Navami ────────────────────────────────────────────────────────────
    ('Ram Navami',           [('madhyahna', 'Ram Janma — Madhyahna Kaal (Midday)'),
                              ('abhijit',   'Ram Puja — Abhijit Muhurta')]),
    # ── Ganesh Chaturthi ─────────────────────────────────────────────────────
    ('Ganesh Chaturthi',     [('madhyahna', 'Ganesh Sthapana — Madhyahna Kaal'),
                              ('pratah',    'Ganesh Puja — Pratah Kaal')]),
    # ── Navratri / Durga ─────────────────────────────────────────────────────
    ('Ghatasthapana',        [('pratah',    'Ghatasthapana — Pratah Kaal'),
                              ('abhijit',   'Ghatasthapana — Abhijit Muhurta (alt)')]),
    ('Durgashtami',          [('sandhya',   'Sandhi Puja — Sandhya Kaal'),
                              ('aparahna',  'Durga Puja — Aparahna Kaal')]),
    ('Maha Navami',          [('pratah',    'Navami Havan — Pratah Kaal'),
                              ('aparahna',  'Ayudha Puja — Aparahna Kaal')]),
    ('Vijaya Dashami',       [('aparahna',  'Vijayadashami Muhurta — Aparahna Kaal'),
                              ('abhijit',   'Shastra Puja — Abhijit Muhurta')]),
    # ── Sankrantis ───────────────────────────────────────────────────────────
    ('Makar Sankranti',      [('pratah',    'Punya Kaal — Pratah Kaal'),
                              ('madhyahna', 'Maha Punya Kaal — Madhyahna Kaal')]),
    ('Baisakhi',             [('pratah',    'Auspicious Bath — Pratah Kaal'),
                              ('abhijit',   'Puja — Abhijit Muhurta')]),
    ('Vishu',                [('pratah',    'Vishukkani Darshan — Pratah Kaal')]),
    ('Mesha Sankranti',      [('pratah',    'Punya Kaal — Pratah Kaal')]),
    # ── Other major ──────────────────────────────────────────────────────────
    ('Raksha Bandhan',       [('pratah',    'Rakhi Tying — Pratah Kaal'),
                              ('aparahna',  'Rakhi Tying — Aparahna Kaal')]),
    ('Akshaya Tritiya',      [('abhijit',   'Auspicious Activities — Abhijit Muhurta'),
                              ('pratah',    'Puja & Dana — Pratah Kaal')]),
    ('Vasant Panchami',      [('pratah',    'Saraswati Puja — Pratah Kaal'),
                              ('madhyahna', 'Saraswati Puja — Madhyahna Kaal')]),
    ('Ganga Dussehra',       [('abhijit',   'Ganga Snan — Abhijit Muhurta'),
                              ('pratah',    'Ganga Snan — Pratah Kaal')]),
    ('Dev Uthani Ekadashi',  [('pradosh',   'Tulsi Vivah — Pradosh Kaal'),
                              ('nishita',   'Hari Prabodhini — Nishita Kaal')]),
    ('Kartik Purnima',       [('moonrise',  'Deep Daan — at Moonrise'),
                              ('pratah',    'Kartik Snan — Pratah Kaal')]),
    ('Dev Diwali',           [('moonrise',  'Deep Daan — at Moonrise'),
                              ('pradosh',   'Ganga Aarti — Pradosh Kaal')]),
    ('Sharad Purnima',       [('moonrise',  'Kojagara Puja — at Moonrise'),
                              ('nishita',   'Kheer in Moonlight — Nishita Kaal')]),
    ('Guru Purnima',         [('pratah',    'Guru Puja — Pratah Kaal'),
                              ('madhyahna', 'Guru Puja — Madhyahna Kaal')]),
    ('Guru Nanak Jayanti',   [('pratah',    'Prakash Utsav — Pratah Kaal')]),
    ('Dussehra',             [('aparahna',  'Dussehra Puja — Aparahna Kaal')]),
]


def _compute_puja_windows(festival_str: str, jd_sr: float, jd_ss: float,
                          lat: float, lon: float, tz_str: str) -> list[dict]:
    """Return location-adjusted puja timing windows for this festival string."""
    if not festival_str:
        return []

    day_dur    = jd_ss - jd_sr
    solar_noon = (jd_sr + jd_ss) / 2

    # Next sunrise for Nishita Kaal (midnight)
    try:
        jd_next_sr = _rise_set(jd_ss + 0.5, swe.SUN, swe.CALC_RISE, lat, lon)
    except Exception:
        jd_next_sr = jd_ss + (jd_ss - jd_sr)   # fallback: mirror of day duration
    night_dur  = jd_next_sr - jd_ss
    midnight   = jd_ss + night_dur / 2

    def _window(rule: str) -> tuple[str | None, str | None]:
        if rule == 'pratah':
            return _fmt(jd_sr, tz_str), _fmt(jd_sr + day_dur / 5, tz_str)
        if rule == 'madhyahna':
            return _fmt(jd_sr + 2 * day_dur / 5, tz_str), _fmt(jd_sr + 3 * day_dur / 5, tz_str)
        if rule == 'aparahna':
            return _fmt(jd_sr + 3 * day_dur / 5, tz_str), _fmt(jd_sr + 4 * day_dur / 5, tz_str)
        if rule == 'sandhya':
            return _fmt(jd_sr + 4 * day_dur / 5, tz_str), _fmt(jd_ss, tz_str)
        if rule == 'pradosh':
            return _fmt(jd_ss, tz_str), _fmt(jd_ss + 144 / 1440, tz_str)
        if rule == 'nishita':
            return _fmt(midnight - 24 / 1440, tz_str), _fmt(midnight + 24 / 1440, tz_str)
        if rule == 'abhijit':
            return _fmt(solar_noon - 24 / 1440, tz_str), _fmt(solar_noon + 24 / 1440, tz_str)
        if rule == 'moonrise':
            try:
                jd_mr = _rise_set(jd_sr, swe.MOON, swe.CALC_RISE, lat, lon)
                return _fmt(jd_mr, tz_str), _fmt(jd_mr + 72 / 1440, tz_str)
            except Exception:
                return None, None
        # Maha Shivratri night praharas — night divided into 4 equal watches
        if rule in ('prahara1', 'prahara2', 'prahara3', 'prahara4'):
            i = int(rule[-1]) - 1   # 0–3
            s = jd_ss + i * night_dur / 4
            e = jd_ss + (i + 1) * night_dur / 4
            return _fmt(s, tz_str), _fmt(e, tz_str)
        return None, None

    windows: list[dict] = []
    seen_labels: set[str] = set()
    seen_times:  set[tuple[str, str]] = set()   # deduplicate same time window from different keywords
    for keyword, rules_list in _PUJA_RULES:
        if keyword in festival_str:
            for rule, label in rules_list:
                if label in seen_labels:
                    continue
                start, end = _window(rule)
                if start and end:
                    time_key = (start, end)
                    if time_key in seen_times:
                        continue
                    windows.append({'name': label, 'start': start, 'end': end})
                    seen_labels.add(label)
                    seen_times.add(time_key)
    return windows


# ── Yearly Festival Calendar ───────────────────────────────────────────────────

def get_yearly_festivals(year: int, lat: float, lon: float, tz_str: str) -> list[dict]:
    """Return every festival day in the given calendar year.

    Each entry has: date, day_of_week, masa, tithi, tithi_num, paksha,
    nakshatra, festival (string, may have multiple separated by ' · '),
    special_yogas (list), puja_timings (list of {name, start, end}).
    Days with no festival and no special yoga are omitted.
    """
    from datetime import date as date_cls, timedelta as td
    festivals = []
    d   = date_cls(year, 1, 1)
    end = date_cls(year + 1, 1, 1)
    while d < end:
        info = _quick_day(d.isoformat(), lat, lon, tz_str)
        if info and (info.get('festival') or info.get('special_yogas')):
            puja = _compute_puja_windows(
                info.get('festival', ''),
                info['jd_sr'], info['jd_ss'],
                lat, lon, tz_str,
            )
            entry = {
                'date':          info['date'],
                'day_of_week':   info['day_of_week'],
                'masa':          info['masa'],
                'tithi':         info['tithi'],
                'tithi_num':     info['tithi_num'],
                'paksha':        info['paksha'],
                'nakshatra':     info['nakshatra'],
                'festival':      info.get('festival', ''),
                'special_yogas': info.get('special_yogas', []),
                'puja_timings':  puja,
            }
            # Vriddhi dedup: if previous entry has same tithi (tithi spans two
            # sunrises) OR same nakshatra (nakshatra spans two sunrises), remove
            # duplicate festival names from day 2 — keep only new additions.
            prev_same = festivals and (
                (festivals[-1]['tithi_num'] == entry['tithi_num']
                 and festivals[-1]['paksha'] == entry['paksha']
                 and festivals[-1]['masa']   == entry['masa'])
                or festivals[-1]['nakshatra'] == entry['nakshatra']
            )
            if prev_same:
                prev_parts = {p.strip() for p in festivals[-1]['festival'].split(' · ') if p.strip()}
                curr_parts = [p.strip() for p in entry['festival'].split(' · ') if p.strip()]
                new_parts  = [p for p in curr_parts if p not in prev_parts]
                entry['festival'] = ' · '.join(new_parts)
                if not entry['festival'] and not entry['special_yogas']:
                    d += td(days=1)
                    continue
            festivals.append(entry)
        d += td(days=1)
    return festivals


def geocode_place(query: str) -> dict:
    geolocator = Nominatim(user_agent='kundali_panchang')
    location   = geolocator.geocode(query)
    if not location:
        raise ValueError(f'Could not find: {query}')
    tf  = TimezoneFinder()
    tz  = tf.timezone_at(lat=location.latitude, lng=location.longitude) or 'UTC'
    return {
        'name': location.address,
        'lat':  round(location.latitude, 4),
        'lon':  round(location.longitude, 4),
        'tz':   tz,
    }
