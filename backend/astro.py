import swisseph as swe
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
import pytz
from datetime import datetime, timedelta

PLANETS = {
    0: "Sun", 1: "Moon", 2: "Mercury", 3: "Venus",
    4: "Mars", 5: "Jupiter", 6: "Saturn", 11: "Rahu"
}

SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
         "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]

SIGNS_HINDI = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya",
               "Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"]

NAKSHATRAS = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta",
    "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
]

DASHA_LORDS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"]
DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17]

# Navamsa start signs by D1 sign (fire=Aries, earth=Capricorn, air=Libra, water=Cancer)
_NAVAMSA_START = [0, 9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3]


def _navamsa_sign(lon: float) -> int:
    s = int(lon / 30)
    return (_NAVAMSA_START[s] + int((lon % 30) * 9 / 30)) % 12


def _dasamsa_sign(lon: float) -> int:
    s = int(lon / 30)
    n = int((lon % 30) / 3)
    return (s + n) % 12 if s % 2 == 0 else (s + 9 + n) % 12


def _saptamsa_sign(lon: float) -> int:
    s = int(lon / 30)
    n = int((lon % 30) * 7 / 30)
    return (s + n) % 12 if s % 2 == 0 else (s + 6 + n) % 12


def _dwadasamsa_sign(lon: float) -> int:
    s = int(lon / 30)
    return (s + int((lon % 30) / 2.5)) % 12


def _build_divisional(planet_data: dict, asc_lon: float, sign_fn) -> dict:
    asc_s = sign_fn(asc_lon)
    planets = {}
    for pname, pd in planet_data.items():
        s = sign_fn(pd['longitude'])
        planets[pname] = {
            'sign': SIGNS[s], 'sign_hindi': SIGNS_HINDI[s],
            'sign_num': s, 'house': ((s - asc_s) % 12) + 1,
        }
    houses = {}
    for h in range(1, 13):
        si = (asc_s + h - 1) % 12
        houses[h] = {
            'sign': SIGNS[si], 'sign_hindi': SIGNS_HINDI[si],
            'sign_num': si,
            'planets': [p for p, d in planets.items() if d['house'] == h],
        }
    return {
        'ascendant': {'sign': SIGNS[asc_s], 'sign_hindi': SIGNS_HINDI[asc_s], 'sign_num': asc_s, 'degree': 0},
        'planets': planets,
        'houses': houses,
    }


def get_coordinates(place: str) -> tuple[float, float, str]:
    geolocator = Nominatim(user_agent="kundali_app")
    location = geolocator.geocode(place)
    if not location:
        raise ValueError(f"Could not find location: {place}")
    tf = TimezoneFinder()
    tz_str = tf.timezone_at(lat=location.latitude, lng=location.longitude)
    return location.latitude, location.longitude, tz_str or "UTC"


def calculate_kundali(birth_date: str, birth_time: str, birth_place: str) -> dict:
    lat, lon, tz_str = get_coordinates(birth_place)
    tz = pytz.timezone(tz_str)

    dt_str = f"{birth_date} {birth_time}"
    local_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    local_dt = tz.localize(local_dt)
    utc_dt = local_dt.astimezone(pytz.utc)

    jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day,
                    utc_dt.hour + utc_dt.minute/60.0 + utc_dt.second/3600.0)

    swe.set_sid_mode(swe.SIDM_LAHIRI)

    cusps, ascmc = swe.houses(jd, lat, lon, b'W')
    asc_longitude = ascmc[0]

    ayanamsha = swe.get_ayanamsa(jd)
    asc_sidereal = (asc_longitude - ayanamsha) % 360

    asc_sign_num = int(asc_sidereal / 30)
    asc_degree = asc_sidereal % 30

    planet_data = {}
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED

    for pid, pname in PLANETS.items():
        pos, _ = swe.calc_ut(jd, pid, flags)
        lon_sid = pos[0] % 360
        sign_num = int(lon_sid / 30)
        degree = lon_sid % 30

        house_num = ((sign_num - asc_sign_num) % 12) + 1

        nak_idx = int(lon_sid / (360/27))
        nak_pada = int((lon_sid % (360/27)) / (360/27/4)) + 1

        planet_data[pname] = {
            "longitude": round(lon_sid, 4),
            "sign": SIGNS[sign_num],
            "sign_hindi": SIGNS_HINDI[sign_num],
            "sign_num": sign_num,
            "degree": round(degree, 2),
            "house": house_num,
            "nakshatra": NAKSHATRAS[nak_idx],
            "pada": nak_pada,
            "is_retrograde": pos[3] < 0 if len(pos) > 3 else False,
        }

    rahu = planet_data["Rahu"]
    ketu_lon = (rahu["longitude"] + 180) % 360
    ketu_sign_num = int(ketu_lon / 30)
    ketu_house = ((ketu_sign_num - asc_sign_num) % 12) + 1
    ketu_nak_idx = int(ketu_lon / (360/27))
    planet_data["Ketu"] = {
        "longitude": round(ketu_lon, 4),
        "sign": SIGNS[ketu_sign_num],
        "sign_hindi": SIGNS_HINDI[ketu_sign_num],
        "sign_num": ketu_sign_num,
        "degree": round(ketu_lon % 30, 2),
        "house": ketu_house,
        "nakshatra": NAKSHATRAS[ketu_nak_idx],
        "pada": int((ketu_lon % (360/27)) / (360/27/4)) + 1,
        "is_retrograde": False,
    }

    houses = {}
    for h in range(1, 13):
        sign_idx = (asc_sign_num + h - 1) % 12
        houses[h] = {
            "sign": SIGNS[sign_idx],
            "sign_hindi": SIGNS_HINDI[sign_idx],
            "sign_num": sign_idx,
            "planets": [p for p, d in planet_data.items() if d["house"] == h]
        }

    moon_lon = planet_data["Moon"]["longitude"]
    moon_nak_idx = int(moon_lon / (360/27))
    nak_lord_idx = moon_nak_idx % 9
    elapsed_in_nak = (moon_lon % (360/27)) / (360/27)

    dasha_sequence = []
    remaining_first = DASHA_YEARS[nak_lord_idx] * (1 - elapsed_in_nak)
    today = datetime.now(pytz.utc)

    # First partial dasha
    current_date = local_dt
    end_date = current_date + timedelta(days=remaining_first * 365.25)
    dasha_sequence.append({
        "lord": DASHA_LORDS[nak_lord_idx],
        "years": round(remaining_first, 2),
        "start": current_date.strftime("%Y-%m-%d"),
        "end": end_date.strftime("%Y-%m-%d"),
        "is_current": False,
    })

    # Remaining 8 full dasha cycles (covering the full 120-year Vimshottari cycle)
    current_date = end_date
    for i in range(1, 9):
        idx = (nak_lord_idx + i) % 9
        yrs = DASHA_YEARS[idx]
        end_d = current_date + timedelta(days=yrs * 365.25)
        dasha_sequence.append({
            "lord": DASHA_LORDS[idx],
            "years": yrs,
            "start": current_date.strftime("%Y-%m-%d"),
            "end": end_d.strftime("%Y-%m-%d"),
            "is_current": False,
        })
        current_date = end_d

    # Mark whichever dasha is active today
    for d in dasha_sequence:
        start_dt = datetime.strptime(d["start"], "%Y-%m-%d").replace(tzinfo=pytz.utc)
        end_dt = datetime.strptime(d["end"], "%Y-%m-%d").replace(tzinfo=pytz.utc)
        if start_dt <= today <= end_dt:
            d["is_current"] = True
            break

    # Bhrigu Bindu = midpoint of Rahu and Moon longitudes
    rahu_lon = planet_data["Rahu"]["longitude"]
    moon_lon_raw = planet_data["Moon"]["longitude"]
    bb_raw = (rahu_lon + moon_lon_raw) / 2
    # If they are more than 180° apart, use the other midpoint
    if abs(rahu_lon - moon_lon_raw) > 180:
        bb_raw = (bb_raw + 180) % 360
    bb_lon = bb_raw % 360
    bb_sign_num = int(bb_lon / 30)
    bb_house = ((bb_sign_num - asc_sign_num) % 12) + 1
    bhrigu_bindu = {
        "longitude": round(bb_lon, 4),
        "sign": SIGNS[bb_sign_num],
        "sign_hindi": SIGNS_HINDI[bb_sign_num],
        "degree": round(bb_lon % 30, 2),
        "house": bb_house,
    }

    return {
        "ascendant": {
            "sign": SIGNS[asc_sign_num],
            "sign_hindi": SIGNS_HINDI[asc_sign_num],
            "sign_num": asc_sign_num,
            "degree": round(asc_degree, 2),
            "longitude": round(asc_sidereal, 4),
        },
        "planets": planet_data,
        "houses": houses,
        "dashas": dasha_sequence,
        "bhrigu_bindu": bhrigu_bindu,
        "d9": _build_divisional(planet_data, asc_sidereal, _navamsa_sign),
        "d10": _build_divisional(planet_data, asc_sidereal, _dasamsa_sign),
        "d7": _build_divisional(planet_data, asc_sidereal, _saptamsa_sign),
        "d12": _build_divisional(planet_data, asc_sidereal, _dwadasamsa_sign),
        "birth_info": {
            "date": birth_date,
            "time": birth_time,
            "place": birth_place,
            "lat": lat,
            "lon": lon,
            "timezone": tz_str,
        }
    }
