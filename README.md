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

## What this PR adds

This PR adds a minimal AI orchestration layer that:
- Calls the OpenAI **Responses API**.
- Uses **structured output** with a strict JSON schema.
- Produces a validated `PerformanceIntent` object.
- Feeds that intent into the existing performance loop when appropriate.

Architecture rule:
- AI returns structured intent.
- Controller/performance loop executes intent.
- AI does not directly trigger raw avatar hotkeys or raw overlay events.

## Required environment variables

Copy `.env.example` to `.env` and set at least:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

You still need the existing VTube Studio + controller vars (`VTS_*`, `CONTROLLER_PORT`, etc.).

## `PerformanceIntent` contract

The orchestrator requests and validates this shape:

```ts
type PerformanceIntent = {
  shouldSpeak: boolean;
  spokenText: string;
  emotion:
    | "neutral"
    | "happy"
    | "angry"
    | "pouting"
    | "embarrassed"
    | "excited"
    | "sad"
    | "shocked"
    | "wink";
  notes?: string;
};
```

Validation is done with Zod before the intent is used.

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

### AI orchestration endpoints
- `POST /api/respond-only`
  - Generates and validates `PerformanceIntent`.
  - Returns intent only (no TTS, no avatar/overlay updates).
- `POST /api/respond`
  - Generates and validates `PerformanceIntent`.
  - If `shouldSpeak === true`, executes existing speak/performance loop.
- `GET /api/ai/status`
  - Returns in-memory AI debug status (key configured, model, last intent, last validation error, whether last `/api/respond` triggered speaking).

## PowerShell examples

```powershell
Invoke-RestMethod -Method POST http://localhost:8787/api/respond-only `
  -ContentType "application/json" `
  -Body '{"inputType":"manual","text":"Say something surprised about barely surviving."}'

Invoke-RestMethod -Method POST http://localhost:8787/api/respond `
  -ContentType "application/json" `
  -Body '{"inputType":"event","event":{"type":"game.moment","summary":"The player survived with 1 HP."}}'

Invoke-RestMethod -Method GET http://localhost:8787/api/ai/status
```

## Notes on structured outputs

The orchestration layer uses Responses API structured output so model responses adhere to a JSON schema for deterministic controller behavior.

This keeps model output bounded and safer for live-stream execution compared to freeform response text.

## What to test first

1. `POST /api/respond-only` with a manual prompt and verify a valid `PerformanceIntent` returns.
2. `POST /api/respond` with an event payload and verify `shouldSpeak=true` triggers subtitle + expression + TTS + speaking state.
3. `GET /api/ai/status` and verify last intent / validation status updates.

## Known assumptions

- Orchestration is single-turn and stateless (no memory persistence).
- AI debug state is in-memory only.
- `/api/respond` remains single-flight because it uses the existing speech loop behavior.

## Next follow-up PR

- Add Twitch chat/event ingestion adapters that map external inputs into orchestrator requests.
- Add optional moderation/safety pass before executing `shouldSpeak` intents.
- Add intent quality telemetry (latency + validation metrics) for observability.

## Current non-goals

- No Twitch chat ingestion in this PR.
- No screenshot/screen-analysis ingestion.
- No memory/database persistence.
- No scene automation or autonomous scheduling.
- No voice input / STT.
- No tool-use or agent loops.
