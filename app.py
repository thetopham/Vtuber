from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from vtuber_core import VtuberBrain


class ChatRequest(BaseModel):
    message: str


app = FastAPI(title="Neuro-Like VTuber")
brain = VtuberBrain()

static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    index = static_dir / "index.html"
    return index.read_text(encoding="utf-8")


@app.post("/api/respond")
def respond(payload: ChatRequest) -> dict:
    return brain.respond(payload.message)
