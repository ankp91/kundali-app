# v5 — fix KAAL_VELA_SLOT (= day Kala slot) and VAAR_VELA_SLOT (= 8-d) for all weekdays
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

from astro import calculate_kundali, get_current_transits, calculate_varshaphal, get_transit_calendar
from vision import parse_kundali_image
from matching import calculate_match
from panchang import calculate_panchang, geocode_place, calculate_monthly_panchang, find_muhurta
from ai_agent import (
    interpret_full_chart, interpret_placement,
    chat_with_chart, get_lessons, get_lesson, explain_lesson_topic, interpret_match,
    stream_full_chart, stream_placement, stream_chat, stream_divisional_chart,
    stream_transits, stream_remedies, stream_varshaphal,
    stream_prasna, stream_shadbala_insight,
)

app = FastAPI(title="Kundali API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BirthInput(BaseModel):
    name: str
    birth_date: str
    birth_time: str
    birth_place: str


class ChatMessage(BaseModel):
    message: str
    chart_data: dict
    history: List[dict] = []
    language: str = 'en'
    extra_chart: Optional[dict] = None


class InterpretRequest(BaseModel):
    planet: str
    sign: str
    house: int
    chart_data: dict
    language: str = 'en'


class LessonExplainRequest(BaseModel):
    lesson_id: str
    topic: dict
    chart_data: Optional[dict] = None
    language: str = 'en'


class DivisionalInterpretRequest(BaseModel):
    div_type: str
    div_data: dict
    d1_chart: dict
    language: str = 'en'


class MatchInput(BaseModel):
    name1: str
    birth_date1: str
    birth_time1: str
    birth_place1: str
    name2: str
    birth_date2: str
    birth_time2: str
    birth_place2: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/generate-chart")
def generate_chart(data: BirthInput):
    try:
        chart = calculate_kundali(data.birth_date, data.birth_time, data.birth_place)
        chart["name"] = data.name
        return chart
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/parse-chart")
async def parse_chart(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    mime = file.content_type or "image/jpeg"
    try:
        chart = parse_kundali_image(content, mime)
        return chart
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse chart: {e}")


@app.post("/api/interpret-full")
def full_interpretation(chart_data: dict):
    language = chart_data.pop("language", "en")
    return StreamingResponse(stream_full_chart(chart_data, language), media_type="text/plain; charset=utf-8")


@app.post("/api/interpret-placement")
def placement_interpretation(req: InterpretRequest):
    return StreamingResponse(
        stream_placement(req.planet, req.sign, req.house, req.chart_data, req.language),
        media_type="text/plain; charset=utf-8",
    )


@app.post("/api/chat")
def chat(req: ChatMessage):
    return StreamingResponse(
        stream_chat(req.message, req.chart_data, req.history, req.language, req.extra_chart),
        media_type="text/plain; charset=utf-8",
    )


@app.get("/api/lessons")
def lessons():
    return get_lessons()


@app.get("/api/lessons/{lesson_id}")
def lesson(lesson_id: str):
    l = get_lesson(lesson_id)
    if not l:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return l


@app.post("/api/lessons/explain")
def explain(req: LessonExplainRequest):
    try:
        explanation = explain_lesson_topic(req.lesson_id, req.topic, req.chart_data, req.language)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interpret-divisional")
def interpret_divisional(req: DivisionalInterpretRequest):
    return StreamingResponse(
        stream_divisional_chart(req.div_type, req.div_data, req.d1_chart, req.language),
        media_type="text/plain; charset=utf-8",
    )


@app.post("/api/match-charts")
def match_charts(data: MatchInput):
    try:
        result = calculate_match(
            data.birth_date1, data.birth_time1, data.birth_place1, data.name1,
            data.birth_date2, data.birth_time2, data.birth_place2, data.name2,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/geocode")
def geocode(q: str):
    try:
        return geocode_place(q)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/panchang")
def panchang(date: str, lat: float, lon: float, tz: str):
    try:
        return calculate_panchang(date, lat, lon, tz)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/match-interpret")
def match_interpret(match_data: dict):
    try:
        language = match_data.pop("language", "en")
        return {"interpretation": interpret_match(match_data, language)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TransitsRequest(BaseModel):
    chart_data: dict
    language: str = 'en'


@app.post("/api/transits")
def transits(req: TransitsRequest):
    try:
        asc_sign_num = req.chart_data.get("ascendant", {}).get("sign_num", 0)
        transit_data = get_current_transits(asc_sign_num)
        return transit_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interpret-transits")
def interpret_transits(req: TransitsRequest):
    try:
        asc_sign_num = req.chart_data.get("ascendant", {}).get("sign_num", 0)
        transit_data = get_current_transits(asc_sign_num)
        return StreamingResponse(
            stream_transits(transit_data, req.chart_data, req.language),
            media_type="text/plain; charset=utf-8",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RemediesRequest(BaseModel):
    chart_data: dict
    language: str = 'en'


@app.post("/api/remedies")
def remedies(req: RemediesRequest):
    return StreamingResponse(
        stream_remedies(req.chart_data, req.language),
        media_type="text/plain; charset=utf-8",
    )


class VarshaphalInput(BaseModel):
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    year: int


@app.post("/api/varshaphal")
def varshaphal(data: VarshaphalInput):
    try:
        result = calculate_varshaphal(data.birth_date, data.birth_time, data.birth_place, data.year)
        result["name"] = data.name
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class VarshaphalInterpretRequest(BaseModel):
    chart_data: dict
    year: int
    language: str = 'en'


@app.post("/api/interpret-varshaphal")
def interpret_varshaphal(req: VarshaphalInterpretRequest):
    return StreamingResponse(
        stream_varshaphal(req.chart_data, req.year, req.language),
        media_type="text/plain; charset=utf-8",
    )


@app.get("/api/panchang/monthly")
def panchang_monthly(date: str, lat: float, lon: float, tz: str):
    try:
        parts = date.split("-")
        year, month = int(parts[0]), int(parts[1])
        return calculate_monthly_panchang(year, month, lat, lon, tz)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class MuhurtaRequest(BaseModel):
    activity: str
    date_from: str
    date_to: str
    lat: float
    lon: float
    tz: str


@app.post("/api/muhurta")
def muhurta(req: MuhurtaRequest):
    try:
        return find_muhurta(req.activity, req.date_from, req.date_to, req.lat, req.lon, req.tz)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class TransitCalendarRequest(BaseModel):
    chart_data: dict
    year: int
    month: int


@app.post("/api/transit-calendar")
def transit_calendar(req: TransitCalendarRequest):
    try:
        events = get_transit_calendar(req.chart_data, req.year, req.month)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class PrasnaRequest(BaseModel):
    question: str
    birth_place: str
    language: str = 'en'


@app.post("/api/prasna")
def prasna(data: PrasnaRequest):
    try:
        from datetime import datetime
        import pytz
        now = datetime.now(pytz.utc)
        chart = calculate_kundali(
            now.strftime("%Y-%m-%d"),
            now.strftime("%H:%M"),
            data.birth_place,
        )
        chart["return_date"] = now.strftime("%Y-%m-%d")
        chart["return_time"] = now.strftime("%H:%M")
        chart["question"] = data.question
        return chart
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class PrasnaInterpretRequest(BaseModel):
    question: str
    chart_data: dict
    language: str = 'en'


@app.post("/api/interpret-prasna")
def interpret_prasna_route(req: PrasnaInterpretRequest):
    return StreamingResponse(
        stream_prasna(req.question, req.chart_data, req.language),
        media_type="text/plain; charset=utf-8",
    )


class ShadbalRequest(BaseModel):
    chart_data: dict
    language: str = 'en'


@app.post("/api/interpret-shadbala")
def interpret_shadbala(req: ShadbalRequest):
    shadbala = req.chart_data.get("shadbala", {})
    return StreamingResponse(
        stream_shadbala_insight(shadbala, req.chart_data, req.language),
        media_type="text/plain; charset=utf-8",
    )


# ── Dosha Checker ─────────────────────────────────────────────────────────────

class DoshaRequest(BaseModel):
    planets: dict
    ascendant: dict


_SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
          "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]

_KSD_NAMES = {
    0:"Ananta",1:"Kulik",2:"Vasuki",3:"Shankhapal",4:"Padma",5:"Mahapadma",
    6:"Takshak",7:"Karkotak",8:"Shankhachur",9:"Ghatak",10:"Vishdhar",11:"Sheshnag"
}


@app.post("/api/dosha")
def check_dosha(req: DoshaRequest):
    import swisseph as swe, time as _time

    planets = req.planets

    # ── Mangal Dosha ──────────────────────────────────────────────────────────
    mars_house = planets.get("Mars", {}).get("house", 0)
    mangal_present = mars_house in {1, 2, 4, 7, 8, 12}
    if mars_house in {7, 8}:
        mangal_severity = "High"
    elif mars_house in {1, 4}:
        mangal_severity = "Medium"
    elif mars_house in {2, 12}:
        mangal_severity = "Low"
    else:
        mangal_severity = "None"

    mangal_dosha = {
        "present": mangal_present,
        "mars_house": mars_house,
        "severity": mangal_severity,
        "description": f"Mars is in the {mars_house}{'st' if mars_house==1 else 'nd' if mars_house==2 else 'rd' if mars_house==3 else 'th'} house from Lagna."
    }

    # ── Kal Sarpa Dosha ───────────────────────────────────────────────────────
    def sign_idx(sign_str: str) -> int:
        try:
            return _SIGNS.index(sign_str)
        except ValueError:
            return 0

    rahu_sign_idx = sign_idx(planets.get("Rahu", {}).get("sign", "Aries"))
    ketu_sign_idx = (rahu_sign_idx + 6) % 12

    # Arc from Rahu clockwise to Ketu (exclusive of Rahu and Ketu signs)
    arc = set()
    idx = (rahu_sign_idx + 1) % 12
    while idx != ketu_sign_idx:
        arc.add(idx)
        idx = (idx + 1) % 12

    planet_keys = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]
    planets_in_arc = [p for p in planet_keys if sign_idx(planets.get(p,{}).get("sign","")) in arc]
    # Also count Rahu and Ketu sign positions themselves
    all_in = all(sign_idx(planets.get(p,{}).get("sign","")) in (arc | {rahu_sign_idx}) for p in planet_keys)

    ksd_present = all_in
    ksd_partial = (not all_in) and len(planets_in_arc) >= 5

    kal_sarpa = {
        "present": ksd_present,
        "partial": ksd_partial,
        "rahu_sign": _SIGNS[rahu_sign_idx],
        "ketu_sign": _SIGNS[ketu_sign_idx],
        "type": _KSD_NAMES.get(rahu_sign_idx, "Unknown"),
    }

    # ── Sade Sati ─────────────────────────────────────────────────────────────
    try:
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        _gt = _time.gmtime()
        now_jd = swe.julday(_gt.tm_year, _gt.tm_mon, _gt.tm_mday,
                            _gt.tm_hour + _gt.tm_min / 60 + _gt.tm_sec / 3600)
        sat_lon = swe.calc_ut(now_jd, swe.SATURN, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)[0][0]
        current_sat_idx = int(sat_lon / 30) % 12
    except Exception:
        current_sat_idx = 0

    natal_moon_sign = planets.get("Moon", {}).get("sign", "Aries")
    moon_idx = sign_idx(natal_moon_sign)

    before_moon = (moon_idx - 1) % 12
    after_moon  = (moon_idx + 1) % 12

    if current_sat_idx == moon_idx:
        ss_active = True; ss_phase = "Peak"
    elif current_sat_idx == before_moon:
        ss_active = True; ss_phase = "Rising"
    elif current_sat_idx == after_moon:
        ss_active = True; ss_phase = "Setting"
    else:
        ss_active = False; ss_phase = "None"

    # Small Panoti: Saturn in 4th or 8th from natal Moon
    fourth_from_moon = (moon_idx + 3) % 12
    eighth_from_moon = (moon_idx + 7) % 12
    if current_sat_idx == eighth_from_moon:
        small_panoti = True; small_panoti_type = "Ashtam"
    elif current_sat_idx == fourth_from_moon:
        small_panoti = True; small_panoti_type = "Ardha"
    else:
        small_panoti = False; small_panoti_type = "None"

    sade_sati = {
        "active": ss_active,
        "phase": ss_phase,
        "natal_moon_sign": natal_moon_sign,
        "current_saturn_sign": _SIGNS[current_sat_idx],
        "years_remaining": "~2.5 yrs" if ss_active else "Not active",
        "small_panoti": small_panoti,
        "small_panoti_type": small_panoti_type,
    }

    return {
        "mangal_dosha": mangal_dosha,
        "kal_sarpa": kal_sarpa,
        "sade_sati": sade_sati,
    }


# ── Saturn Transit Timeline ────────────────────────────────────────────────────

class SaturnTimelineRequest(BaseModel):
    natal_moon_sign: str
    years_ahead: int = 35

@app.post("/api/saturn-timeline")
def saturn_timeline(req: SaturnTimelineRequest):
    import swisseph as swe, time as _time
    from datetime import datetime, timezone

    swe.set_sid_mode(swe.SIDM_LAHIRI)

    moon_idx = _SIGNS.index(req.natal_moon_sign) if req.natal_moon_sign in _SIGNS else 0
    # Sade Sati spans 3 consecutive signs (before, on, after Moon sign)
    ss_signs = {(moon_idx - 1) % 12, moon_idx, (moon_idx + 1) % 12}
    phase_name = {
        (moon_idx - 1) % 12: "Rising",
        moon_idx: "Peak",
        (moon_idx + 1) % 12: "Setting",
    }
    ardha_sign  = (moon_idx + 3) % 12   # 4th from Moon
    ashtam_sign = (moon_idx + 7) % 12   # 8th from Moon

    def jd_to_date(jd: float) -> str:
        try:
            y, m, d, _ = swe.revjul(jd)
            return f"{int(y)}-{int(m):02d}-{int(d):02d}"
        except Exception:
            return "?"

    def saturn_sign_at(jd: float) -> int:
        try:
            lon = swe.calc_ut(jd, swe.SATURN, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)[0][0]
            return int(lon / 30) % 12
        except Exception:
            return 0

    # Find ingress dates: scan 35 years ahead in 5-day steps
    _gt = _time.gmtime()
    now_jd = swe.julday(_gt.tm_year, _gt.tm_mon, _gt.tm_mday,
                        _gt.tm_hour + _gt.tm_min / 60 + _gt.tm_sec / 3600)
    end_jd  = now_jd + req.years_ahead * 365.25

    ingresses = []   # list of (sign_idx, ingress_jd)
    prev_sign = saturn_sign_at(now_jd)
    ingresses.append((prev_sign, now_jd))   # start with current sign/date

    jd = now_jd + 5
    while jd < end_jd:
        curr_sign = saturn_sign_at(jd)
        if curr_sign != prev_sign:
            # Binary search for exact ingress within ±5 days
            lo, hi = jd - 5, jd
            for _ in range(22):
                mid = (lo + hi) / 2
                if saturn_sign_at(mid) == prev_sign:
                    lo = mid
                else:
                    hi = mid
            ingresses.append((curr_sign, (lo + hi) / 2))
            prev_sign = curr_sign
        jd += 5

    # Build timeline events from ingresses
    events = []
    for i, (sign_idx, entry_jd) in enumerate(ingresses):
        exit_jd = ingresses[i + 1][1] if i + 1 < len(ingresses) else end_jd

        if sign_idx in ss_signs:
            events.append({
                "type": "Sade Sati",
                "phase": phase_name[sign_idx],
                "sign": _SIGNS[sign_idx],
                "start": jd_to_date(entry_jd),
                "end":   jd_to_date(exit_jd),
                "is_current": entry_jd <= now_jd < exit_jd,
                "intensity": "high" if sign_idx == moon_idx else "medium",
            })
        elif sign_idx == ardha_sign:
            events.append({
                "type": "Ardha Shani (Dhaiya)",
                "phase": "Ardha Panoti",
                "sign": _SIGNS[sign_idx],
                "start": jd_to_date(entry_jd),
                "end":   jd_to_date(exit_jd),
                "is_current": entry_jd <= now_jd < exit_jd,
                "intensity": "medium",
            })
        elif sign_idx == ashtam_sign:
            events.append({
                "type": "Ashtam Shani",
                "phase": "Ashtam Panoti",
                "sign": _SIGNS[sign_idx],
                "start": jd_to_date(entry_jd),
                "end":   jd_to_date(exit_jd),
                "is_current": entry_jd <= now_jd < exit_jd,
                "intensity": "medium",
            })

    return {
        "natal_moon_sign": req.natal_moon_sign,
        "events": events,
        "current_saturn_sign": _SIGNS[saturn_sign_at(now_jd)],
    }


# ── Baby Names by Nakshatra ───────────────────────────────────────────────────

_NAKSHATRA_DATA = [
    ("Ashwini","Aries","Mars",[("Chu","चु"),("Che","चे"),("Cho","चो"),("La","ला")],["Chulbul","Chetan","Chotu","Lata","Lalita","Chaman"]),
    ("Bharani","Aries","Mars",[("Li","ली"),("Lu","लू"),("Le","ले"),("Lo","लो")],["Lila","Luv","Leela","Lohit","Lokesh","Lola"]),
    ("Krittika","Aries/Taurus","Sun",[("A","अ"),("I","इ"),("U","उ"),("E","ए")],["Anil","Anita","Isha","Uma","Ekta","Esha"]),
    ("Rohini","Taurus","Venus",[("O","ओ"),("Va","वा"),("Vi","वि"),("Vu","वु")],["Om","Omkar","Varun","Vijay","Vikas","Vinod"]),
    ("Mrigashira","Taurus/Gemini","Mars",[("Ve","वे"),("Vo","वो"),("Ka","का"),("Ki","कि")],["Veda","Venu","Karan","Kavya","Kishan","Kiran"]),
    ("Ardra","Gemini","Rahu",[("Ku","कु"),("Gha","घ"),("Ng","ञ"),("Chha","छ")],["Kumar","Kunal","Ghanshyam","Ghazal","Chhavi","Chhaya"]),
    ("Punarvasu","Gemini/Cancer","Jupiter",[("Ke","के"),("Ko","को"),("Ha","ह"),("Hi","हि")],["Keval","Kedar","Komal","Harish","Harsha","Hiren"]),
    ("Pushya","Cancer","Saturn",[("Hu","हु"),("He","हे"),("Ho","हो"),("Da","ड")],["Huma","Hemant","Hema","Homi","Daksh","Dinesh"]),
    ("Ashlesha","Cancer","Mercury",[("Di","डि"),("Du","डु"),("De","डे"),("Do","डो")],["Divya","Dileep","Durga","Deepa","Devika","Dolly"]),
    ("Magha","Leo","Ketu",[("Ma","म"),("Mi","मि"),("Mu","मु"),("Me","मे")],["Mahesh","Manish","Mira","Mukesh","Meera","Mohan"]),
    ("Purva Phalguni","Leo","Venus",[("Mo","मो"),("Ta","ट"),("Ti","टि"),("Tu","टु")],["Mohit","Monika","Tarun","Tina","Tinku","Tej"]),
    ("Uttara Phalguni","Leo/Virgo","Sun",[("Te","टे"),("To","टो"),("Pa","पा"),("Pi","पि")],["Tej","Toshi","Pavan","Payal","Piyush","Pinky"]),
    ("Hasta","Virgo","Moon",[("Pu","पु"),("Sha","ष"),("Na","ण"),("Tha","ठ")],["Pushpa","Purvi","Shailesh","Shanta","Natasha","Thakur"]),
    ("Chitra","Virgo/Libra","Mars",[("Pe","पे"),("Po","पो"),("Ra","र"),("Ri","रि")],["Pena","Pooja","Ravi","Rahul","Rita","Rishi"]),
    ("Swati","Libra","Rahu",[("Ru","रु"),("Re","रे"),("Ro","रो"),("Ta","त")],["Ruchi","Rupali","Reena","Rohit","Tarun","Tanvi"]),
    ("Vishakha","Libra/Scorpio","Jupiter",[("Ti","ति"),("Tu","तु"),("Te","ते"),("To","तो")],["Tina","Tinku","Tara","Tejas","Tosha","Tulsi"]),
    ("Anuradha","Scorpio","Saturn",[("Na","न"),("Ni","नि"),("Nu","नु"),("Ne","ने")],["Naman","Namita","Nikhil","Nisha","Nupur","Neha"]),
    ("Jyeshtha","Scorpio","Mercury",[("No","नो"),("Ya","य"),("Yi","यि"),("Yu","यु")],["Noor","Yash","Yamini","Yuvan","Yuvraj","Yogesh"]),
    ("Mula","Sagittarius","Ketu",[("Ye","ये"),("Yo","यो"),("Ba","भ"),("Bi","भि")],["Yesh","Yogi","Bharat","Bhaskar","Bimal","Bijay"]),
    ("Purva Ashadha","Sagittarius","Venus",[("Bu","भू"),("Dha","ध"),("Bha","भ"),("Dha2","ढ")],["Bhuvan","Dhruv","Dhara","Bhanupratap","Bhavik","Dharini"]),
    ("Uttara Ashadha","Sagittarius/Capricorn","Sun",[("Be","भे"),("Bo","भो"),("Ja","ज"),("Ji","जि")],["Beena","Bhoomi","Jatin","Jai","Jiya","Jitesh"]),
    ("Shravana","Capricorn","Moon",[("Khi","खि"),("Khu","खु"),("Khe","खे"),("Kho","खो")],["Khushi","Khusboo","Khilesh","Khyati","Khemraj","Khooshboo"]),
    ("Dhanishtha","Capricorn/Aquarius","Mars",[("Ga","ग"),("Gi","गि"),("Gu","गु"),("Ge","गे")],["Gagan","Gauri","Girish","Gita","Gulab","Geeta"]),
    ("Shatabhisha","Aquarius","Rahu",[("Go","गो"),("Sa","स"),("Si","सि"),("Su","सु")],["Gopal","Govind","Sanjay","Savita","Sita","Sunil"]),
    ("Purva Bhadrapada","Aquarius/Pisces","Jupiter",[("Se","से"),("So","सो"),("Da","द"),("Di","दि")],["Seema","Sonal","Daksh","Dinesh","Divya","Deepak"]),
    ("Uttara Bhadrapada","Pisces","Saturn",[("Du","दु"),("Tha","थ"),("Jha","झ"),("Da","दा")],["Dushyant","Thakur","Jhanvi","Jharna","Damodar","Daya"]),
    ("Revati","Pisces","Mercury",[("De","दे"),("Do","दो"),("Cha","च"),("Chi","चि")],["Deval","Devina","Dolly","Chandan","Chitra","Chintan"]),
]


def _nak_to_response(idx: int) -> dict:
    name, rashi, lord, padas_raw, names = _NAKSHATRA_DATA[idx]
    return {
        "index": idx,
        "nakshatra": name,
        "rashi": rashi,
        "rashi_lord": lord,
        "padas": [{"pada": i+1, "akshar": a, "devanagari": d} for i,(a,d) in enumerate(padas_raw)],
        "sample_names": names,
    }


@app.get("/api/baby-names")
def baby_names_all():
    return [
        {
            "index": i,
            "nakshatra": n[0],
            "rashi": n[1],
            "aksharas": ", ".join(a for a,_ in n[3]),
        }
        for i, n in enumerate(_NAKSHATRA_DATA)
    ]


@app.get("/api/baby-names/{nakshatra_index}")
def baby_names_by_nakshatra(nakshatra_index: int):
    if nakshatra_index < 0 or nakshatra_index > 26:
        raise HTTPException(status_code=400, detail="nakshatra_index must be 0–26")
    return _nak_to_response(nakshatra_index)


# ── Garbhadhana Conception Window ─────────────────────────────────────────────

# Nakshatra classifications for Garbhadhana (Muhurta Chintamani + Dharmasindhu)
_GARB_NAK_BEST = {"Rohini","Mrigashira","Uttara Phalguni","Uttara Ashadha","Uttara Bhadrapada","Revati","Anuradha","Hasta","Swati"}
_GARB_NAK_GOOD = {"Ashwini","Punarvasu","Shravana","Dhanishtha","Chitra","Vishakha"}
_GARB_NAK_AVOID = {"Bharani","Krittika","Ardra","Pushya","Ashlesha","Magha","Purva Phalguni","Jyeshtha","Mula","Purva Ashadha","Purva Bhadrapada","Shatabhisha"}

# Tithis to avoid for Garbhadhana (1-indexed)
_GARB_TITHI_AVOID = {1, 4, 6, 8, 9, 12, 14, 15, 30}

# Days (weekday 0=Sun..6=Sat) to avoid
_GARB_VARA_AVOID = {2, 6}  # Tuesday, Saturday

class ConceptionWindowRequest(BaseModel):
    menses_start: str  # YYYY-MM-DD
    lat: float = 28.6139
    lon: float = 77.2090
    tz: str = "Asia/Kolkata"

@app.post("/api/garbhadhana-window")
def garbhadhana_window(req: ConceptionWindowRequest):
    from panchang import calculate_panchang, _weekday, _local_to_jd, _now_jd
    import swisseph as swe
    from datetime import datetime, timedelta
    import pytz

    try:
        base_date = datetime.strptime(req.menses_start, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="menses_start must be YYYY-MM-DD")

    results = []
    for night_num in range(4, 17):  # nights 4–16
        # Night N = evening of day (N-1) after menses start
        night_date = base_date + timedelta(days=night_num - 1)
        date_str = night_date.strftime("%Y-%m-%d")

        try:
            pdata = calculate_panchang(date_str, req.lat, req.lon, req.tz)
        except Exception:
            continue

        tithi_num = pdata.get("tithi", {}).get("number", 0)
        nakshatra_name = pdata.get("nakshatra", {}).get("name", "")
        weekday = pdata.get("vara", {}).get("number", 0)  # 0=Sun..6=Sat

        # Night classification
        is_even = (night_num % 2 == 0)
        gender_hint = "Putra (Son)" if is_even else "Kanya (Daughter)"

        # Nakshatra rating
        if nakshatra_name in _GARB_NAK_BEST:
            nak_rating = "best"
        elif nakshatra_name in _GARB_NAK_GOOD:
            nak_rating = "good"
        elif nakshatra_name in _GARB_NAK_AVOID:
            nak_rating = "avoid"
        else:
            nak_rating = "acceptable"

        # Tithi rating
        tithi_avoid = tithi_num in _GARB_TITHI_AVOID
        vara_avoid = weekday in _GARB_VARA_AVOID

        # Kaal Ratri for this night — from choghadiya overlaps
        choghadiya = pdata.get("choghadiya", {}).get("night", [])
        kaal_ratri_slots = [s for s in choghadiya if "kaal_ratri" in (s.get("overlaps") or [])]

        # Overall rating
        if nak_rating == "avoid" or tithi_avoid or vara_avoid:
            overall = "avoid"
        elif nak_rating == "best" and not tithi_avoid and not vara_avoid:
            overall = "best"
        elif nak_rating in ("good", "acceptable") and not tithi_avoid and not vara_avoid:
            overall = "good"
        else:
            overall = "acceptable"

        results.append({
            "night_num": night_num,
            "date": date_str,
            "gender_hint": gender_hint,
            "is_even": is_even,
            "nakshatra": nakshatra_name,
            "nakshatra_rating": nak_rating,
            "tithi": pdata.get("tithi", {}).get("name", ""),
            "tithi_num": tithi_num,
            "tithi_avoid": tithi_avoid,
            "vara": pdata.get("vara", {}).get("name", ""),
            "vara_avoid": vara_avoid,
            "overall": overall,
            "kaal_ratri_slots": kaal_ratri_slots,
            "sunrise": pdata.get("sunrise", ""),
            "sunset": pdata.get("sunset", ""),
        })

    return {"nights": results, "menses_start": req.menses_start}
