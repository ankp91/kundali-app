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
