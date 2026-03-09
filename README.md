# AI VTuber Controller MVP (Local-first)

A TypeScript monorepo MVP with OBS overlay and controller APIs.

## Monorepo structure

```text
/apps
  /overlay      React overlay UI rendered in OBS Browser Source
  /controller   Express + WebSocket controller service
/packages
  /shared       Shared event schema/types/constants/config
```

## Minimal TTS performance loop (this PR)

This PR adds a narrow first-pass speech pipeline in `apps/controller`:
- Speech provider abstraction.
- OpenAI TTS provider implementation.
- Local audio playback service (Windows-first, default output device).
- Performance loop that sequences emotion → subtitle → speaking/state flags → audio playback → reset.

The existing VTube Studio expression flow is reused and not rewritten.

## Required environment variables

Copy `.env.example` to `.env` and set at least:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

You still need the existing VTube Studio + controller vars (`VTS_*`, `CONTROLLER_PORT`, etc.).

## API endpoints

### Overlay/state endpoints
- `POST /api/subtitle`
- `POST /api/speaking`
- `POST /api/status`
- `POST /api/state`

### Avatar endpoints
- `POST /api/avatar/emotion`
- `POST /api/avatar/expression`
- `POST /api/avatar/test-cycle`
- `GET /api/avatar/status`

### Speech endpoints
- `POST /api/speak`
- `POST /api/test/speak`
- `GET /api/speech/status`

## Example curl commands

```bash
# 1) Speak an arbitrary line with requested emotion
Invoke-RestMethod -Method POST http://localhost:8787/api/speak `
  -ContentType "application/json" `
  -Body '{"text":"Wow! That was unexpected.","emotion":"shocked"}'

# 2) Run canned speech test line
Invoke-RestMethod -Method POST http://localhost:8787/api/test/speak `
  -ContentType "application/json" `
  -Body '{}'

# 3) Inspect speech debug status
Invoke-RestMethod -Method GET http://localhost:8787/api/speech/status
```

## How to verify subtitle + speaking + avatar sync

1. Start VTube Studio and ensure plugin/API auth is working.
2. Start controller + overlay (`npm run dev`).
3. Call `/api/speak` with text and emotion.
4. Confirm in overlay:
   - subtitle updates to your line,
   - speaking indicator becomes active during playback,
   - speaking indicator clears when playback ends.
5. Confirm avatar expression updates to requested emotion before audio plays.
6. Confirm `/api/speech/status` reports useful debug state (`isPlaying`, last text/emotion, controller state).

## Windows local playback note

On Windows, playback uses PowerShell + .NET `System.Windows.Media.MediaPlayer` and plays audio through the default system output device. No external routing tools are required in this PR.

## What to test first

1. `POST /api/test/speak` (quick sanity test).
2. `GET /api/speech/status` before and after test.
3. `POST /api/speak` with a few emotions (`happy`, `sad`, `shocked`) and verify expression + subtitle + speaking timing.

## Known assumptions

- This version is intentionally synchronous and single-flight: one speech request at a time.
- Audio is synthesized as WAV via OpenAI speech API and played after full file generation (no streaming yet).
- Temp files are created for playback and cleaned up after playback.

## Next follow-up PR

- Add a queued speech scheduler instead of single-flight rejection.
- Add configurable post-speech resting emotion behavior.
- Add optional richer timeline events (durations/latency) for debugging.

## Non-goals in this PR

- No LLM orchestration.
- No Twitch chat ingestion.
- No screenshot/screen-analysis ingestion.
- No scene automation or persistence.
- No voice input / speech-to-text.
- No realtime streaming audio.
