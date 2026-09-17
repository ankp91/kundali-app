from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

from astro import calculate_kundali
from vision import parse_kundali_image
from matching import calculate_match
from ai_agent import (
    interpret_full_chart, interpret_placement,
    chat_with_chart, get_lessons, get_lesson, explain_lesson_topic, interpret_match,
    stream_full_chart, stream_placement, stream_chat,
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


class InterpretRequest(BaseModel):
    planet: str
    sign: str
    house: int
    chart_data: dict


class LessonExplainRequest(BaseModel):
    lesson_id: str
    topic: dict
    chart_data: Optional[dict] = None


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
    return StreamingResponse(stream_full_chart(chart_data), media_type="text/plain; charset=utf-8")


@app.post("/api/interpret-placement")
def placement_interpretation(req: InterpretRequest):
    return StreamingResponse(
        stream_placement(req.planet, req.sign, req.house, req.chart_data),
        media_type="text/plain; charset=utf-8",
    )


@app.post("/api/chat")
def chat(req: ChatMessage):
    return StreamingResponse(
        stream_chat(req.message, req.chart_data, req.history),
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
        explanation = explain_lesson_topic(req.lesson_id, req.topic, req.chart_data)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@app.post("/api/match-interpret")
def match_interpret(match_data: dict):
    try:
        return {"interpretation": interpret_match(match_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
