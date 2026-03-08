# NeuroStyle VTuber (Neuro-sama inspired starter)

This repository now contains a **starter VTuber stack** that behaves like a Neuro-sama style AI entertainer:

- stream-safe, witty persona prompt
- conversational memory (short rolling history)
- optional OpenAI-powered replies (with local fallback)
- optional text-to-speech output
- optional VTube Studio websocket emotion/hotkey triggering

> This is a foundation project, not a full production clone.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m src.vtuber.app
```

## Environment variables

- `OPENAI_API_KEY` (optional): enables OpenAI chat replies
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
- `VTUBE_WS_URL` (optional, default `ws://127.0.0.1:8001`)
- `VTUBE_AUTH_TOKEN` (optional)
- `VOICE_ENABLED` (`1`/`0`, default `1`)

## What it does

- Type messages in terminal as if they are chat input.
- AI responds in a Neuro-style playful persona.
- App maps response tone to a simple expression (`happy`, `angry`, `surprised`, `neutral`).
- If connected, it triggers corresponding VTube Studio hotkeys.
- It also attempts local TTS (if `pyttsx3` works in your environment).

## Project layout

- `src/vtuber/app.py` - main loop
- `src/vtuber/brain.py` - persona + LLM adapter
- `src/vtuber/avatar.py` - VTube Studio websocket client
- `src/vtuber/voice.py` - speech output helper
- `config/persona.md` - editable persona prompt

## Notes

To get closer to full Neuro-sama behavior, you would typically add:
- speech-to-text from microphone/live stream
- Twitch/YouTube chat ingestion
- moderation and safety filters
- improved memory and context retrieval
- animation blending/lip sync integration
