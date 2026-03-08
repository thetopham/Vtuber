# NeuroSama-Style VTuber Starter

This repository now contains a **local VTuber brain starter kit** you can use to build a streamer similar in architecture to Neuro-sama:

- Persona + style system prompt
- Safety/moderation gate
- Short-term memory window
- Chat loop that responds to audience messages
- Optional hooks for OBS / TTS / Twitch integration

> ⚠️ This is a *starter framework* — not a full clone.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python neurosama_like.py
```

Then type chat messages in the terminal.

## Architecture

- `neurosama_like.py` – runnable entry point
- `vtuber_core/brain.py` – orchestrates persona, memory, moderation, and generation
- `vtuber_core/memory.py` – rolling memory buffer
- `vtuber_core/moderation.py` – lightweight content filter
- `vtuber_core/providers.py` – response providers (rule-based default + OpenAI-compatible provider)

## Feature roadmap

- Add real Twitch chat ingestion
- Add TTS output (e.g., Coqui or ElevenLabs)
- Add OBS scene switching via WebSocket
- Add emotion classifier for expression/animation control
- Add long-term memory store (SQLite/vector DB)

## Notes

- This project defaults to a local rule-based provider so it works out of the box.
- To use an LLM, set `OPENAI_API_KEY` in `.env` and switch provider in `neurosama_like.py`.
