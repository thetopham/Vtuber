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

## AI emotion selection (safe structured intent)

This PR keeps the architecture narrow and deterministic:
- AI returns a structured `PerformanceIntent`.
- AI chooses **one internal emotion label only**.
- Controller executes via the existing performance loop.
- Existing expression engine remains source-of-truth for mapping emotion to avatar expressions/toggles.
- AI does not directly control raw VTube Studio hotkeys/toggles.

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

Validation is done with strict Zod schemas (`.strict()`, no extra keys).

## Allowed AI emotion labels

- `neutral`
- `happy`
- `angry`
- `pouting`
- `embarrassed`
- `excited`
- `sad`
- `shocked`
- `wink`

## Emotion mapping in avatar pipeline

1. `/api/respond-only` or `/api/respond` asks AI for `PerformanceIntent`.
2. Controller validates intent; invalid model output falls back to `neutral` emotion safely.
3. `/api/respond` sends `spokenText` + `emotion` into `PerformanceLoop.performLine`.
4. `PerformanceLoop` calls `ExpressionEngine.buildExpressionState(emotion)` and applies it.
5. Existing avatar adapter and hotkey mapping stay unchanged.

## API endpoints

### AI orchestration endpoints
- `POST /api/respond-only`
  - Generates and validates `PerformanceIntent`.
  - Returns intent only (no TTS, no avatar/overlay updates).
- `POST /api/respond`
  - Generates and validates `PerformanceIntent`.
  - If `shouldSpeak === true`, executes existing speak/performance loop.
- `GET /api/ai/status`
  - Returns in-memory AI debug status:
    - `lastIntent`
    - `lastEmotion`
    - validation success/error
    - fallback usage
    - whether last `/api/respond` triggered speaking
    - last raw model payload text

### Existing endpoints (unchanged)
- Overlay/state: `POST /api/subtitle`, `POST /api/speaking`, `POST /api/status`, `POST /api/state`
- Avatar: `POST /api/avatar/emotion`, `POST /api/avatar/expression`, `POST /api/avatar/test-cycle`, `GET /api/avatar/status`
- Speech: `POST /api/speak`, `POST /api/test/speak`, `GET /api/speech/status`
- Persona: `GET /api/persona`, `POST /api/persona`, `GET /api/personas`, `POST /api/personas`, `POST /api/personas/load`

## PowerShell examples

```powershell
Invoke-RestMethod -Method POST http://localhost:8787/api/respond-only `
  -ContentType "application/json" `
  -Body '{"inputType":"manual","text":"Say something surprised ."}'

Invoke-RestMethod -Method POST http://localhost:8787/api/respond-only `
  -ContentType "application/json" `
  -Body '{"inputType":"manual","text":"Say something playful and slightly embarrassed."}'

Invoke-RestMethod -Method POST http://localhost:8787/api/respond-only `
  -ContentType "application/json" `
  -Body '{"inputType":"manual","text":"Say something hyped after a big win."}'

Invoke-RestMethod -Method POST http://localhost:8787/api/respond-only `
  -ContentType "application/json" `
  -Body '{"inputType":"manual","text":"Say something surprised about barely surviving."}'

Invoke-RestMethod -Method POST http://localhost:8787/api/respond `
  -ContentType "application/json" `
  -Body '{"inputType":"manual","text":"Say something playful and slightly embarrassed."}'

Invoke-RestMethod -Method GET http://localhost:8787/api/ai/status
```

## Safe fallback behavior

- If model output fails validation, controller uses fallback intent with `emotion: "neutral"`.
- Fallback preserves safety and keeps execution deterministic.
- AI status endpoint reports whether fallback was used.

## What to test first

1. `POST /api/respond-only` with manual prompts and verify returned intent always uses an allowed emotion.
2. `POST /api/respond` and confirm subtitle + speaking-state + TTS + expression all run through existing loop.
3. `GET /api/ai/status` and verify validation and fallback fields update as expected.

## Known assumptions

- Orchestration is single-turn and stateless (no memory persistence).
- AI debug state is in-memory only.
- `/api/respond` remains single-flight because it uses existing speech loop behavior.

## Next follow-up PR

- Add Twitch chat/event ingestion adapters that map external inputs into orchestrator requests.
- Add optional moderation/safety pass before executing `shouldSpeak` intents.
- Add intent quality telemetry (latency + validation metrics) for observability.

## Current non-goals

- No Twitch chat ingestion in this PR.
- No screenshot/screen-analysis ingestion.
- No memory/database persistence.
- No scene automation or autonomous scheduling.
- No moderation pipeline.
- No multi-emotion combo generation by the model.
- No direct model control of raw avatar expressions/hotkeys.
