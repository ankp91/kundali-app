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
DAY_CHOG_START   = [4, 0, 3, 6, 2, 5, 1]
NIGHT_CHOG_START = [2, 5, 0, 1, 3, 4, 6]

HORA_PLANETS   = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars']
HORA_DAY_START = [0, 3, 6, 2, 5, 1, 4]

# Inauspicious kalam slot numbers (1-indexed out of 8 equal day slots, Sun=index 0)
RAHU_KALAM_SLOT = [8, 2, 7, 5, 6, 3, 4]   # Sun=8, Mon=2, Tue=7, Wed=5, Thu=6, Fri=3, Sat=4
YAMAGANDA_SLOT  = [5, 4, 3, 2, 1, 7, 6]   # Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
GULIKAI_SLOT    = [7, 6, 5, 4, 3, 2, 1]   # Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1

RITU_NAMES = ['Vasanta','Grishma','Varsha','Sharad','Hemanta','Shishira']


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

    return {
        'date': date_str,
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
        'ritu':      ritu,
        'ayana':     ayana,
        'dinamana':  f"{day_min // 60}h {day_min % 60:02d}m",
        'ratrimana': f"{night_min // 60}h {night_min % 60:02d}m",
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
        name = CHOG_NAMES[(start + i) % 7]
        overlaps = []
        if kalams and day:
            for kname, k in kalams.items():
                if s < k['jd_end'] and e > k['jd_start']:
                    overlaps.append(kname)
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
    day_minutes = day_dur_jd * 24 * 60
    ghati_mins  = day_minutes / 60

    is_day      = jd_sr <= now_jd <= jd_ss
    elapsed_jd  = max(0.0, now_jd - jd_sr)

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
