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


def _hora_sign(lon: float) -> int:
    s = int(lon / 30)
    deg = lon % 30
    # even signs (0,2,4,6,8,10): 0-15=Leo(4), 15-30=Cancer(3)
    # odd signs (1,3,5,7,9,11): 0-15=Cancer(3), 15-30=Leo(4)
    if s % 2 == 0:
        return 4 if deg < 15 else 3
    else:
        return 3 if deg < 15 else 4


def _drekkana_sign(lon: float) -> int:
    s = int(lon / 30)
    n = int((lon % 30) / 10)   # 0,1,2
    return (s + n * 4) % 12    # same, 5th, 9th sign


def _shashtiamsha_sign(lon: float) -> int:
    s = int(lon / 30)
    part = int((lon % 30) * 2)  # 0-59
    return part % 12 if s % 2 == 0 else (part + 6) % 12


SIGN_LORDS = ["Mars","Venus","Mercury","Moon","Sun","Mercury",
              "Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"]

EXALTED_SIGNS = {
    "Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5,
    "Jupiter": 3, "Venus": 11, "Saturn": 6
}
OWN_SIGNS = {
    "Sun": [4], "Moon": [3], "Mars": [0, 7],
    "Mercury": [2, 5], "Jupiter": [8, 11],
    "Venus": [1, 6], "Saturn": [9, 10]
}


def detect_yogas(planet_data: dict, houses: dict, asc_sign_num: int) -> list:
    yogas = []
    p = planet_data

    def house_of(name):
        return p[name]["house"] if name in p else None

    def sign_of(name):
        return p[name]["sign_num"] if name in p else None

    # Gaja Kesari: Jupiter in kendra (1,4,7,10) from Moon
    if "Jupiter" in p and "Moon" in p:
        diff = (p["Jupiter"]["house"] - p["Moon"]["house"]) % 12
        if diff in (0, 3, 6, 9):
            yogas.append({
                "name": "Gaja Kesari Yoga",
                "description": "Jupiter in a kendra house from Moon — grants elephant-lion strength, wisdom, fame, and prosperity.",
                "strength": "strong",
                "planets": ["Jupiter", "Moon"]
            })

    # Budha-Aditya: Sun & Mercury in same sign
    if "Sun" in p and "Mercury" in p and sign_of("Sun") == sign_of("Mercury"):
        yogas.append({
            "name": "Budha-Aditya Yoga",
            "description": "Sun and Mercury together — grants sharp intellect, good communication, government favour, and success in business.",
            "strength": "moderate",
            "planets": ["Sun", "Mercury"]
        })

    # Chandra-Mangala: Moon & Mars conjunct
    if "Moon" in p and "Mars" in p and sign_of("Moon") == sign_of("Mars"):
        yogas.append({
            "name": "Chandra-Mangala Yoga",
            "description": "Moon and Mars together — grants wealth through bold action, entrepreneurial spirit, and emotional courage.",
            "strength": "moderate",
            "planets": ["Moon", "Mars"]
        })

    # Pancha Mahapurusha Yogas — planet in own/exalted sign in kendra
    mahapurusha = [
        ("Mars",    "Ruchaka Yoga",  "Exceptional physical strength, courage, land ownership — Ruchaka Mahapurusha."),
        ("Mercury", "Bhadra Yoga",   "Excellent intellect, communication mastery, business acumen — Bhadra Mahapurusha."),
        ("Jupiter", "Hamsa Yoga",    "Wisdom, spirituality, great fortune, dharmic life — Hamsa Mahapurusha."),
        ("Venus",   "Malavya Yoga",  "Beauty, luxury, artistic genius, happy relationships — Malavya Mahapurusha."),
        ("Saturn",  "Sasa Yoga",     "Discipline, authority, service leadership, lasting achievements — Sasa Mahapurusha."),
    ]
    for planet, yoga_name, desc in mahapurusha:
        if planet in p:
            sign = sign_of(planet)
            house = house_of(planet)
            in_own = sign in OWN_SIGNS.get(planet, [])
            in_exalted = sign == EXALTED_SIGNS.get(planet)
            in_kendra = house in (1, 4, 7, 10)
            if (in_own or in_exalted) and in_kendra:
                yogas.append({
                    "name": yoga_name,
                    "description": desc,
                    "strength": "strong",
                    "planets": [planet]
                })

    # Kemadruma Yoga: no planets in 2nd or 12th sign from Moon (sign-wise)
    if "Moon" in p:
        moon_sign = sign_of("Moon")
        adjacent_signs = {(moon_sign + 1) % 12, (moon_sign - 1) % 12}
        other_planets = [name for name in p if name not in ("Moon", "Rahu", "Ketu")]
        has_adjacent = any(sign_of(name) in adjacent_signs for name in other_planets)
        if not has_adjacent:
            yogas.append({
                "name": "Kemadruma Yoga",
                "description": "No planets in 2nd or 12th from Moon — indicates periods of self-reliance, emotional isolation, or unconventional success without support.",
                "strength": "challenging",
                "planets": ["Moon"]
            })

    # Raj Yoga: lord of kendra (1,4,7,10) + lord of trikona (1,5,9) conjunct
    kendra_houses = {1, 4, 7, 10}
    trikona_houses = {1, 5, 9}
    kendra_lords = set()
    trikona_lords = set()
    for h in range(1, 13):
        sign_idx = (asc_sign_num + h - 1) % 12
        lord = SIGN_LORDS[sign_idx]
        if lord in ("Rahu", "Ketu"):
            continue
        if h in kendra_houses:
            kendra_lords.add(lord)
        if h in trikona_houses:
            trikona_lords.add(lord)
    for kl in kendra_lords:
        for tl in trikona_lords:
            if kl != tl and kl in p and tl in p:
                if sign_of(kl) == sign_of(tl):
                    yogas.append({
                        "name": f"Raj Yoga ({kl}–{tl})",
                        "description": f"Lords of a kendra ({kl}) and trikona ({tl}) are conjunct — grants authority, power, and significant rise in status.",
                        "strength": "strong",
                        "planets": [kl, tl]
                    })

    # Dhana Yoga: 2nd lord + 11th lord conjunct
    second_sign = (asc_sign_num + 1) % 12
    eleventh_sign = (asc_sign_num + 10) % 12
    lord_2nd = SIGN_LORDS[second_sign]
    lord_11th = SIGN_LORDS[eleventh_sign]
    if lord_2nd in p and lord_11th in p and lord_2nd != lord_11th:
        if sign_of(lord_2nd) == sign_of(lord_11th):
            yogas.append({
                "name": "Dhana Yoga",
                "description": f"Lords of 2nd ({lord_2nd}) and 11th ({lord_11th}) houses conjunct — powerful wealth accumulation yoga.",
                "strength": "strong",
                "planets": [lord_2nd, lord_11th]
            })

    # Viparita Raja Yoga: 6th/8th/12th lords in another dusthana house
    dusthana_houses = {6, 8, 12}
    dusthana_lords = {}
    for h in dusthana_houses:
        sign_idx = (asc_sign_num + h - 1) % 12
        lord = SIGN_LORDS[sign_idx]
        dusthana_lords[h] = lord
    for h, lord in dusthana_lords.items():
        if lord in p:
            if house_of(lord) in dusthana_houses and house_of(lord) != h:
                yogas.append({
                    "name": "Viparita Raja Yoga",
                    "description": f"{lord} (lord of {h}th) placed in another dusthana house — rise through adversity; success comes through challenges and overcoming obstacles.",
                    "strength": "moderate",
                    "planets": [lord]
                })
                break

    return yogas


def get_current_transits(natal_asc_sign_num: int) -> dict:
    today = datetime.now(pytz.utc)
    jd = swe.julday(today.year, today.month, today.day,
                    today.hour + today.minute / 60.0)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    transits = {}
    for pid, pname in PLANETS.items():
        pos, _ = swe.calc_ut(jd, pid, flags)
        lon = pos[0] % 360
        sign_num = int(lon / 30)
        degree = lon % 30
        house = ((sign_num - natal_asc_sign_num) % 12) + 1
        nak_idx = int(lon / (360 / 27))
        transits[pname] = {
            "longitude": round(lon, 4),
            "sign": SIGNS[sign_num],
            "sign_hindi": SIGNS_HINDI[sign_num],
            "sign_num": sign_num,
            "degree": round(degree, 2),
            "house": house,
            "nakshatra": NAKSHATRAS[nak_idx],
            "is_retrograde": pos[3] < 0 if len(pos) > 3 else False,
        }
    rahu = transits["Rahu"]
    ketu_lon = (rahu["longitude"] + 180) % 360
    ketu_sign = int(ketu_lon / 30)
    transits["Ketu"] = {
        "longitude": round(ketu_lon, 4),
        "sign": SIGNS[ketu_sign],
        "sign_hindi": SIGNS_HINDI[ketu_sign],
        "sign_num": ketu_sign,
        "degree": round(ketu_lon % 30, 2),
        "house": ((ketu_sign - natal_asc_sign_num) % 12) + 1,
        "nakshatra": NAKSHATRAS[int(ketu_lon / (360 / 27))],
        "is_retrograde": False,
    }
    return {
        "date": today.strftime("%Y-%m-%d"),
        "planets": transits,
    }


_AV_TABLES = {
    "Sun": {
        "Sun":     [1,2,4,7,8,9,10,11],
        "Moon":    [3,6,10,11],
        "Mars":    [1,2,4,7,8,9,10,11],
        "Mercury": [3,5,6,9,10,11,12],
        "Jupiter": [5,6,9,11],
        "Venus":   [6,7,12],
        "Saturn":  [1,2,4,7,8,9,10,11],
        "Lagna":   [3,4,6,10,11,12],
    },
    "Moon": {
        "Sun":     [3,6,7,8,10,11],
        "Moon":    [1,3,6,7,10,11],
        "Mars":    [2,3,5,6,9,10,11],
        "Mercury": [1,3,4,5,7,8,10,11],
        "Jupiter": [1,4,7,8,10,11,12],
        "Venus":   [3,4,5,7,9,10,11],
        "Saturn":  [3,5,6,11],
        "Lagna":   [3,6,10,11],
    },
    "Mars": {
        "Sun":     [3,5,6,10,11],
        "Moon":    [3,6,11],
        "Mars":    [1,2,4,7,8,9,10,11],
        "Mercury": [3,5,6,11],
        "Jupiter": [6,10,11,12],
        "Venus":   [6,8,11,12],
        "Saturn":  [1,4,7,8,9,10,11],
        "Lagna":   [1,3,6,10,11],
    },
    "Mercury": {
        "Sun":     [5,6,9,11,12],
        "Moon":    [2,4,6,8,10,11],
        "Mars":    [1,2,4,7,8,9,10,11],
        "Mercury": [1,3,5,6,9,10,11,12],
        "Jupiter": [6,8,11,12],
        "Venus":   [1,2,3,4,5,8,9,11],
        "Saturn":  [1,2,4,7,8,9,10,11],
        "Lagna":   [1,2,4,6,8,10,11],
    },
    "Jupiter": {
        "Sun":     [1,2,3,4,7,8,9,10,11],
        "Moon":    [2,5,7,9,11],
        "Mars":    [1,2,4,7,8,9,10,11],
        "Mercury": [1,2,4,5,6,9,10,11],
        "Jupiter": [1,2,3,4,7,8,10,11],
        "Venus":   [2,5,6,9,10,11],
        "Saturn":  [3,5,6,12],
        "Lagna":   [1,2,4,5,6,7,9,10,11],
    },
    "Venus": {
        "Sun":     [8,11,12],
        "Moon":    [1,2,3,4,5,8,9,11,12],
        "Mars":    [3,4,6,9,11,12],
        "Mercury": [3,5,6,9,11],
        "Jupiter": [5,8,9,10,11],
        "Venus":   [1,2,3,4,5,8,9,10,11],
        "Saturn":  [3,4,5,8,9,10,11],
        "Lagna":   [1,2,3,4,5,8,9,11],
    },
    "Saturn": {
        "Sun":     [1,2,4,7,8,9,10,11],
        "Moon":    [3,6,11],
        "Mars":    [3,5,6,10,11,12],
        "Mercury": [6,8,9,10,11,12],
        "Jupiter": [5,6,11,12],
        "Venus":   [6,11,12],
        "Saturn":  [3,5,6,11],
        "Lagna":   [1,3,4,6,10,11],
    },
}

_AV_PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]


def calculate_ashtakavarga(planet_data: dict, asc_sign_num: int) -> dict:
    contributor_signs = {p: planet_data[p]["sign_num"] for p in _AV_PLANET_ORDER if p in planet_data}
    contributor_signs["Lagna"] = asc_sign_num

    result = {}
    sarva = [0] * 12

    for target_planet, table in _AV_TABLES.items():
        if target_planet not in planet_data:
            continue
        sign_scores = [0] * 12
        for sign_idx in range(12):
            score = 0
            for contributor, benefic_positions in table.items():
                contrib_sign = contributor_signs.get(contributor)
                if contrib_sign is None:
                    continue
                rel_pos = (sign_idx - contrib_sign) % 12 + 1
                if rel_pos in benefic_positions:
                    score += 1
            sign_scores[sign_idx] = score
        total = sum(sign_scores)
        result[target_planet] = {
            "sign_scores": sign_scores,
            "signs": SIGNS,
            "total": total,
        }
        for i in range(12):
            sarva[i] += sign_scores[i]

    result["sarvashtakavarga"] = {
        "sign_scores": sarva,
        "signs": SIGNS,
        "total": sum(sarva),
    }
    return result


EXALT_DEG = {"Sun": 10.0, "Moon": 33.0, "Mars": 298.0, "Mercury": 165.0,
             "Jupiter": 95.0, "Venus": 357.0, "Saturn": 200.0}
DEBI_DEG  = {p: (d + 180) % 360 for p, d in EXALT_DEG.items()}

DIG_BALA_HOUSE = {"Sun": 10, "Mars": 10, "Moon": 4, "Venus": 4,
                  "Mercury": 1, "Jupiter": 1, "Saturn": 7}

NAISARGIKA_BALA = {"Sun": 60.0, "Moon": 51.43, "Venus": 51.43,
                   "Jupiter": 34.29, "Mercury": 25.71, "Mars": 17.14, "Saturn": 8.57}

_SIGN_REL = {
    "Sun":     {4:'own',0:'exalt',3:'friend',8:'friend',1:'neutral',6:'neutral',2:'enemy',5:'enemy',7:'neutral',9:'enemy',10:'neutral',11:'friend'},
    "Moon":    {3:'own',1:'exalt',2:'friend',0:'neutral',4:'friend',5:'neutral',6:'friend',8:'neutral',9:'neutral',10:'neutral',11:'friend',7:'enemy'},
    "Mars":    {0:'own',7:'own',9:'exalt',4:'friend',8:'friend',10:'friend',3:'neutral',11:'neutral',2:'enemy',5:'enemy',1:'enemy',6:'enemy'},
    "Mercury": {2:'own',5:'own',1:'friend',6:'friend',9:'neutral',10:'neutral',0:'enemy',3:'enemy',4:'neutral',7:'neutral',8:'neutral',11:'enemy'},
    "Jupiter": {8:'own',11:'own',3:'exalt',0:'friend',4:'friend',7:'neutral',9:'neutral',1:'enemy',2:'enemy',5:'enemy',6:'enemy',10:'neutral'},
    "Venus":   {1:'own',6:'own',11:'exalt',2:'friend',9:'friend',10:'friend',8:'neutral',0:'enemy',3:'enemy',4:'neutral',5:'neutral',7:'neutral'},
    "Saturn":  {9:'own',10:'own',6:'exalt',2:'friend',11:'friend',1:'neutral',5:'neutral',0:'enemy',3:'enemy',4:'enemy',7:'neutral',8:'neutral'},
}


def calculate_shadbala(planet_data: dict, asc_sign_num: int) -> dict:
    result = {}
    planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

    for planet in planets:
        if planet not in planet_data:
            continue
        pd = planet_data[planet]
        lon = pd["longitude"]
        sign = pd["sign_num"]
        house = pd["house"]
        is_retro = pd.get("is_retrograde", False)

        exalt = EXALT_DEG[planet]
        dist_exalt = abs((lon - exalt + 180) % 360 - 180)
        uccha = round((180 - dist_exalt) / 3, 2)

        rel = _SIGN_REL.get(planet, {}).get(sign, 'neutral')
        if rel in ('own', 'exalt'):
            sthana = 45.0
        elif rel == 'mool':
            sthana = 37.5
        elif rel == 'friend':
            sthana = 22.5
        elif rel == 'neutral':
            sthana = 15.0
        else:
            sthana = 7.5

        best = DIG_BALA_HOUSE.get(planet, 1)
        h_diff = abs(house - best)
        if h_diff > 6:
            h_diff = 12 - h_diff
        dig = round(60 * (1 - h_diff / 6), 2)

        chesta = 60.0 if is_retro else 30.0

        naisargika = NAISARGIKA_BALA[planet]
        total = round(uccha + sthana + dig + chesta + naisargika, 2)

        if total >= 250:
            strength, label = "very_strong", "Very Strong"
        elif total >= 180:
            strength, label = "strong", "Strong"
        elif total >= 120:
            strength, label = "moderate", "Moderate"
        elif total >= 60:
            strength, label = "weak", "Weak"
        else:
            strength, label = "very_weak", "Very Weak"

        result[planet] = {
            "total": total,
            "strength": strength,
            "strength_label": label,
            "components": {
                "uccha_bala": {"value": uccha, "max": 60, "label": "Exaltation Strength",
                    "desc": "How close the planet is to its exaltation point. High = planet's energy is amplified."},
                "sthana_bala": {"value": sthana, "max": 45, "label": "Sign Placement",
                    "desc": "Whether in own sign, exaltation, friendly, neutral, or enemy sign."},
                "dig_bala": {"value": dig, "max": 60, "label": "Directional Strength",
                    "desc": "Each planet thrives in a specific house. Full strength when there."},
                "chesta_bala": {"value": chesta, "max": 60, "label": "Motional Strength",
                    "desc": "Retrograde planets have heightened intensity and power."},
                "naisargika_bala": {"value": naisargika, "max": 60, "label": "Natural Strength",
                    "desc": "Inherent natural strength — Sun and Saturn are naturally strongest."},
            }
        }
    return result


def get_transit_calendar(natal_chart: dict, year: int, month: int) -> list:
    import calendar as cal_mod
    natal_planets = natal_chart.get("planets", {})
    natal_asc_sign = natal_chart.get("ascendant", {}).get("sign_num", 0)
    days_in_month = cal_mod.monthrange(year, month)[1]

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED

    events = []
    prev_signs: dict = {}

    for day in range(1, days_in_month + 2):
        d = day if day <= days_in_month else days_in_month
        jd = swe.julday(year, month, d, 12.0)
        day_signs = {}
        day_lons = {}

        for pid, pname in PLANETS.items():
            pos, _ = swe.calc_ut(jd, pid, flags)
            lon_v = pos[0] % 360
            day_signs[pname] = int(lon_v / 30)
            day_lons[pname] = round(lon_v, 2)
        rahu_lon_v = day_lons.get("Rahu", 0)
        ketu_lon_v = (rahu_lon_v + 180) % 360
        day_signs["Ketu"] = int(ketu_lon_v / 30)
        day_lons["Ketu"] = round(ketu_lon_v, 2)

        if day > 1 and day <= days_in_month:
            date_str = f"{year:04d}-{month:02d}-{day:02d}"
            for pname, sign in day_signs.items():
                if prev_signs.get(pname) != sign and pname in prev_signs:
                    events.append({
                        "date": date_str,
                        "type": "ingress",
                        "planet": pname,
                        "from_sign": SIGNS[prev_signs[pname]],
                        "to_sign": SIGNS[sign],
                        "house": ((sign - natal_asc_sign) % 12) + 1,
                        "desc": f"{pname} moves from {SIGNS[prev_signs[pname]]} to {SIGNS[sign]} (natal House {((sign - natal_asc_sign) % 12) + 1})",
                    })
            for t_planet, t_lon in day_lons.items():
                for n_planet, n_data in natal_planets.items():
                    n_lon = n_data.get("longitude", 0)
                    diff = abs((t_lon - n_lon + 180) % 360 - 180)
                    if diff <= 3.0 and t_planet != n_planet:
                        already = any(
                            e["type"] == "conjunction" and
                            e["planet"] == t_planet and
                            e["natal_planet"] == n_planet and
                            abs((int(e["date"][-2:]) - day)) <= 3
                            for e in events
                        )
                        if not already:
                            events.append({
                                "date": date_str,
                                "type": "conjunction",
                                "planet": t_planet,
                                "natal_planet": n_planet,
                                "orb": round(diff, 1),
                                "house": n_data.get("house", 0),
                                "desc": f"{t_planet} conjuncts natal {n_planet} in {n_data.get('sign','')} (House {n_data.get('house','')})",
                            })
        prev_signs = day_signs.copy()

    events.sort(key=lambda e: e["date"])
    return events


def calculate_varshaphal(birth_date: str, birth_time: str, birth_place: str, year: int) -> dict:
    lat, lon, tz_str = get_coordinates(birth_place)
    tz = pytz.timezone(tz_str)
    dt_str = f"{birth_date} {birth_time}"
    local_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    local_dt = tz.localize(local_dt)
    utc_dt = local_dt.astimezone(pytz.utc)

    jd_natal = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day,
                          utc_dt.hour + utc_dt.minute / 60.0)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    sun_natal, _ = swe.calc_ut(jd_natal, 0, flags)
    natal_sun_lon = sun_natal[0] % 360

    birth_month = utc_dt.month
    birth_day = utc_dt.day

    jd_start = swe.julday(year, birth_month, max(1, birth_day - 2), 0)
    jd_end = swe.julday(year, birth_month, min(28, birth_day + 2), 23)

    lo, hi = jd_start, jd_end
    for _ in range(50):
        mid = (lo + hi) / 2
        sun_mid, _ = swe.calc_ut(mid, 0, flags)
        sun_lon = sun_mid[0] % 360
        diff = (sun_lon - natal_sun_lon + 180) % 360 - 180
        if abs(diff) < 0.0001:
            break
        if diff > 0:
            hi = mid
        else:
            lo = mid

    jd_return = (lo + hi) / 2

    y, m, d, hfrac = swe.revjul(jd_return)
    h = int(hfrac)
    mi = int((hfrac - h) * 60)
    return_utc = datetime(y, m, d, h, mi, tzinfo=pytz.utc)
    return_local = return_utc.astimezone(tz)

    cusps, ascmc = swe.houses(jd_return, lat, lon, b'W')
    asc_longitude = ascmc[0]
    ayanamsha = swe.get_ayanamsa(jd_return)
    asc_sidereal = (asc_longitude - ayanamsha) % 360
    asc_sign_num = int(asc_sidereal / 30)
    asc_degree = asc_sidereal % 30

    vp_planet_data = {}
    for pid, pname in PLANETS.items():
        pos, _ = swe.calc_ut(jd_return, pid, flags)
        lon_sid = pos[0] % 360
        sign_num = int(lon_sid / 30)
        degree = lon_sid % 30
        house_num = ((sign_num - asc_sign_num) % 12) + 1
        nak_idx = int(lon_sid / (360 / 27))
        nak_pada = int((lon_sid % (360 / 27)) / (360 / 27 / 4)) + 1
        vp_planet_data[pname] = {
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

    vp_rahu = vp_planet_data["Rahu"]
    ketu_lon = (vp_rahu["longitude"] + 180) % 360
    ketu_sign_num = int(ketu_lon / 30)
    vp_planet_data["Ketu"] = {
        "longitude": round(ketu_lon, 4),
        "sign": SIGNS[ketu_sign_num],
        "sign_hindi": SIGNS_HINDI[ketu_sign_num],
        "sign_num": ketu_sign_num,
        "degree": round(ketu_lon % 30, 2),
        "house": ((ketu_sign_num - asc_sign_num) % 12) + 1,
        "nakshatra": NAKSHATRAS[int(ketu_lon / (360 / 27))],
        "pada": int((ketu_lon % (360 / 27)) / (360 / 27 / 4)) + 1,
        "is_retrograde": False,
    }

    vp_houses = {}
    for h in range(1, 13):
        sign_idx = (asc_sign_num + h - 1) % 12
        vp_houses[h] = {
            "sign": SIGNS[sign_idx],
            "sign_hindi": SIGNS_HINDI[sign_idx],
            "sign_num": sign_idx,
            "planets": [p for p, d in vp_planet_data.items() if d["house"] == h]
        }

    return {
        "year": year,
        "return_date": return_local.strftime("%Y-%m-%d"),
        "return_time": return_local.strftime("%H:%M"),
        "return_datetime_utc": return_utc.strftime("%Y-%m-%d %H:%M UTC"),
        "ascendant": {
            "sign": SIGNS[asc_sign_num],
            "sign_hindi": SIGNS_HINDI[asc_sign_num],
            "sign_num": asc_sign_num,
            "degree": round(asc_degree, 2),
            "longitude": round(asc_sidereal, 4),
        },
        "planets": vp_planet_data,
        "houses": vp_houses,
        "birth_info": {
            "date": birth_date,
            "time": birth_time,
            "place": birth_place,
            "lat": lat,
            "lon": lon,
            "timezone": tz_str,
        }
    }


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


def _calculate_antardashas(mahadasha_lord: str, mahadasha_start: str, mahadasha_years: float) -> list:
    lord_idx = DASHA_LORDS.index(mahadasha_lord)
    antardashas = []
    current = datetime.strptime(mahadasha_start, "%Y-%m-%d")
    today = datetime.now(pytz.utc).replace(tzinfo=None)
    for i in range(9):
        idx = (lord_idx + i) % 9
        ad_lord = DASHA_LORDS[idx]
        ad_years = mahadasha_years * DASHA_YEARS[idx] / 120.0
        end = current + timedelta(days=ad_years * 365.25)
        is_current = current <= today <= end
        antardashas.append({
            "lord": ad_lord,
            "years": round(ad_years, 2),
            "start": current.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d"),
            "is_current": is_current,
        })
        current = end
    return antardashas


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

    # Add antardasha (sub-periods) to each mahadasha
    for d in dasha_sequence:
        d["antardashas"] = _calculate_antardashas(d["lord"], d["start"], d["years"])

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
        "d2": _build_divisional(planet_data, asc_sidereal, _hora_sign),
        "d3": _build_divisional(planet_data, asc_sidereal, _drekkana_sign),
        "d60": _build_divisional(planet_data, asc_sidereal, _shashtiamsha_sign),
        "yogas": detect_yogas(planet_data, houses, asc_sign_num),
        "ashtakavarga": calculate_ashtakavarga(planet_data, asc_sign_num),
        "shadbala": calculate_shadbala(planet_data, asc_sign_num),
        "birth_info": {
            "date": birth_date,
            "time": birth_time,
            "place": birth_place,
            "lat": lat,
            "lon": lon,
            "timezone": tz_str,
        }
    }
