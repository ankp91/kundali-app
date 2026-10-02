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

# 7 Choghadiya in cyclic order
CHOG_NAMES  = ['Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh']
CHOG_NATURE = {
    'Amrit':'very_good','Shubh':'good','Labh':'good',
    'Char':'neutral','Udveg':'bad','Rog':'bad','Kaal':'bad',
}
# Start index into CHOG_NAMES for each weekday (0=Sun)
DAY_CHOG_START   = [4, 0, 3, 6, 2, 5, 1]   # Sun=Udveg, Mon=Amrit, Tue=Rog, Wed=Labh, Thu=Shubh, Fri=Char, Sat=Kaal
NIGHT_CHOG_START = [2, 5, 0, 1, 3, 4, 6]   # Sun=Shubh, Mon=Char, Tue=Amrit, Wed=Kaal, Thu=Rog, Fri=Udveg, Sat=Labh

# Hora planet order (Chaldean) and day start index by weekday
HORA_PLANETS  = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars']
HORA_DAY_START = [0, 3, 6, 2, 5, 1, 4]  # Sun, Mon, Tue, Wed, Thu, Fri, Sat


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
    return (dt.weekday() + 1) % 7   # Python: Mon=0→1, …, Sun=6→0


def _now_jd() -> float:
    utc = datetime.utcnow()
    return swe.julday(utc.year, utc.month, utc.day,
                      utc.hour + utc.minute/60.0 + utc.second/3600.0)


# ── Core calculation ──────────────────────────────────────────────────────────

def calculate_panchang(date_str: str, lat: float, lon: float, tz_str: str) -> dict:
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    # JD for local noon of the requested date
    jd_noon = _local_to_jd(date_str, 12.0, tz_str)

    # Sunrise / sunset / moonrise
    jd_sr        = _rise_set(jd_noon - 0.5, swe.SUN,  swe.CALC_RISE, lat, lon)
    jd_ss        = _rise_set(jd_noon,        swe.SUN,  swe.CALC_SET,  lat, lon)
    jd_next_sr   = _rise_set(jd_noon + 0.5, swe.SUN,  swe.CALC_RISE, lat, lon)
    jd_mr        = _rise_set(jd_noon - 0.5, swe.MOON, swe.CALC_RISE, lat, lon)

    weekday = _weekday(jd_sr, tz_str)

    # Planet positions at sunrise for panchang elements
    sun_sid  = _sidereal(jd_sr, swe.SUN)
    moon_sid = _sidereal(jd_sr, swe.MOON)

    # Tithi
    diff     = (moon_sid - sun_sid) % 360
    tithi_i  = int(diff / 12)           # 0–29
    paksha   = 'Shukla' if tithi_i < 15 else 'Krishna'

    # Nakshatra (Moon)
    nak_deg  = 360 / 27
    nak_i    = int(moon_sid / nak_deg)  # 0–26
    nak_pada = int((moon_sid % nak_deg) / (nak_deg / 4)) + 1  # 1–4

    # Yoga
    yoga_i   = int(((sun_sid + moon_sid) % 360) / (360 / 27))  # 0–26

    # Karana (half-tithi)
    kar_i = int(diff / 6)               # 0–59
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

    # Choghadiya
    day_chog   = _choghadiya(jd_sr,  jd_ss,      weekday, day=True,  tz=tz_str)
    night_chog = _choghadiya(jd_ss,  jd_next_sr, weekday, day=False, tz=tz_str)

    # Hora
    hora = _hora(jd_sr, weekday, tz_str)

    # Vedic time (current moment)
    vedic_time = _vedic_time(jd_sr, jd_ss, tz_str)

    return {
        'date': date_str,
        'vara': {
            'name': VARA[weekday], 'name_hi': VARA_HI[weekday], 'lord': VARA_LORD[weekday],
        },
        'tithi': {
            'name': TITHI[tithi_i], 'number': tithi_i + 1, 'paksha': paksha,
        },
        'nakshatra': {
            'name': NAKSHATRA[nak_i], 'name_hi': NAKSHATRA_HI[nak_i], 'pada': nak_pada,
        },
        'yoga': {'name': YOGA[yoga_i], 'number': yoga_i + 1},
        'karana': {'name': karana},
        'sunrise': _fmt(jd_sr, tz_str),
        'sunset':  _fmt(jd_ss, tz_str),
        'moonrise': _fmt(jd_mr, tz_str),
        'choghadiya': {'day': day_chog, 'night': night_chog},
        'hora': hora,
        'vedic_time': vedic_time,
    }


def _choghadiya(jd_start: float, jd_end: float, weekday: int, day: bool, tz: str) -> list:
    dur    = (jd_end - jd_start) / 8
    start  = DAY_CHOG_START[weekday] if day else NIGHT_CHOG_START[weekday]
    now_jd = _now_jd()
    slots  = []
    for i in range(8):
        s = jd_start + i * dur
        e = jd_start + (i + 1) * dur
        name = CHOG_NAMES[(start + i) % 7]
        slots.append({
            'name': name,
            'nature': CHOG_NATURE[name],
            'start': _fmt(s, tz),
            'end':   _fmt(e, tz),
            'active': s <= now_jd < e,
        })
    return slots


def _hora(jd_sr: float, weekday: int, tz: str) -> list:
    start  = HORA_DAY_START[weekday]
    now_jd = _now_jd()
    slots  = []
    for i in range(24):
        s = jd_sr + i / 24.0
        e = jd_sr + (i + 1) / 24.0
        planet = HORA_PLANETS[(start + i) % 7]
        slots.append({
            'hour': i + 1,
            'planet': planet,
            'start': _fmt(s, tz),
            'end':   _fmt(e, tz),
            'active': s <= now_jd < e,
        })
    return slots


def _vedic_time(jd_sr: float, jd_ss: float, tz: str) -> dict:
    now_jd       = _now_jd()
    day_dur_jd   = jd_ss - jd_sr           # in days
    day_minutes  = day_dur_jd * 24 * 60    # total daylight in minutes
    ghati_mins   = day_minutes / 60        # 1 ghati = day_minutes/60 minutes

    is_day = jd_sr <= now_jd <= jd_ss

    if is_day:
        elapsed_jd = now_jd - jd_sr
    else:
        elapsed_jd = max(0.0, now_jd - jd_sr)

    ghati_f  = (elapsed_jd / day_dur_jd) * 60
    ghati    = int(ghati_f)
    pala_f   = (ghati_f - ghati) * 60
    pala     = int(pala_f)
    vipala   = int((pala_f - pala) * 60)

    return {
        'ghati':  ghati,
        'pala':   pala,
        'vipala': vipala,
        'is_day': is_day,
        'ghati_duration_min': round(ghati_mins, 1),
        'sunrise': _fmt(jd_sr, tz),
        'sunset':  _fmt(jd_ss, tz),
    }


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
