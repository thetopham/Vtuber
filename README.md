# Neuro-Like VTuber Starter

A lightweight VTuber prototype inspired by the **style** of AI streamers like Neuro-sama.

## Features

- Persona-driven AI chat responses
- Mood detection (hype, sarcastic, focused, wholesome)
- Lightweight "avatar state" output (`talking`, `emotion`, `intensity`) for animation hooks
- Simple browser chat UI with an animated face (blink + talk effect)
- FastAPI backend, easy to extend with:
  - TTS (e.g., ElevenLabs, Coqui, Azure)
  - Speech-to-text
  - OBS/WebSocket scene automation
  - Live2D / VRM model control

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`.

## Notes

This project intentionally avoids cloning any copyrighted character identity directly.
It gives you a **foundation** for building your own streamer persona.
