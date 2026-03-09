# AI VTuber Controller MVP (Local-first)

A TypeScript monorepo MVP with OBS overlay + controller APIs.

## Monorepo structure

```text
/apps
  /overlay      React overlay UI rendered in OBS Browser Source
  /controller   Express + WebSocket controller service
/packages
  /shared       Shared event schema/types/constants/config
```

## Minimal TTS performance loop (this PR)

This PR adds a focused, first-pass speech pipeline in `apps/controller`:
- Speech provider abstraction (`SpeechProvider`).
- OpenAI TTS provider (`OpenAISpeechProvider`).
- Windows-friendly local playback using PowerShell + `System.Media.SoundPlayer`.
- Performance loop (`PerformanceLoop`) that runs:
  1) emotion apply,
  2) subtitle publish,
  3) speaking + state flags,
  4) TTS generation,
  5) local playback,
  6) speaking + state reset.

No LLM orchestration, Twitch ingestion, scene automation, or realtime streaming is included.

## Environment setup

Copy `.env.example` to `.env` and set at least:

```bash
OPENAI_API_KEY=...
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

Existing VTube Studio settings still apply (`VTS_*` + hotkeys).

## API endpoints

### Speech endpoints

- `POST /api/speak`
- `POST /api/test/speak`
- `GET /api/speech/status`

### Existing avatar endpoints

- `POST /api/avatar/emotion`
- `POST /api/avatar/expression`
- `POST /api/avatar/test-cycle`
- `GET /api/avatar/status`

### Existing overlay endpoints

- `POST /api/subtitle`
- `POST /api/speaking`
- `POST /api/status`

## Example curl commands

```bash
# 1) Canned speech test
curl -X POST http://localhost:8787/api/test/speak \
  -H "Content-Type: application/json" \
  -d '{}'

# 2) Custom speech line + emotion
curl -X POST http://localhost:8787/api/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Wow! That was unexpected.","emotion":"shocked"}'

# 3) Inspect speech/controller status
curl http://localhost:8787/api/speech/status
```

## How to verify subtitle + speaking + emotion sync

1. Start VTube Studio and load your model.
2. Start controller + overlay (`npm run dev`).
3. Call `POST /api/speak`.
4. Verify:
   - avatar emotion changes immediately,
   - subtitle updates to the speech text,
   - speaking indicator is active during playback,
   - controller `state` becomes `speaking`,
   - after audio finishes, speaking returns false and state goes back to `idle`.

## Windows notes for local playback

- This v1 playback path is Windows-only by design.
- Audio plays through the default Windows output device.
- Playback shell command uses `powershell.exe` + `.wav` temp files.
- Temp files are cleaned up shortly after playback.

## What to test first

1. `POST /api/test/speak` with VTube Studio open.
2. `GET /api/speech/status` before and after speaking.
3. `POST /api/speak` with a few emotions (`happy`, `shocked`, `embarrassed`).
4. Confirm overlay subtitle + speaking indicator and avatar expression stay in sync for each line.

## Known assumptions

- Local playback target is Windows development environment.
- OpenAI Speech API key/model/voice are valid.
- Speech is generated as `.wav` in one shot (no streaming in v1).
- A failed playback/tts call still resets speaking state in `finally`.

## Next follow-up PR

- Queue/interrupt behavior for back-to-back lines.
- Optional resting-expression return policy after speech.
- Add provider extensibility (e.g., local/offline TTS provider).
- Add timing metadata for richer lip-sync and subtitle pacing.
