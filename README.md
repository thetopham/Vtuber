# AI VTuber Controller (Multi-Performer v1)

This monorepo now supports **two AI VTubers** (`nova`, `echo`) with a shared director that can run autonomous banter and handle interrupts.

## Architecture

- AI still returns strict structured `PerformanceIntent` (validated).
- Controller + performance loop executes intent.
- AI still does **not** trigger raw hotkeys or raw overlay events directly.
- Each performer owns:
  - persona config
  - `VTubeStudioClient` / `VTubeStudioAdapter`
  - `ExpressionEngine`
  - `PerformanceLoop`
  - `ResponseOrchestrator`
- `ConversationDirector` manages:
  - turn-taking
  - autonomous banter loop
  - chat/operator interruption
  - global single-speaker lock (v1: one performer speaks at a time)

## New endpoints

### Performer endpoints
- `GET /api/performers`
- `GET /api/performers/:id/status`
- `GET /api/performers/:id/persona`
- `POST /api/performers/:id/persona`
- `POST /api/performers/:id/respond`
- `POST /api/performers/:id/respond-only`

### Director endpoints
- `GET /api/director/status`
- `POST /api/director/banter/start`
- `POST /api/director/banter/stop`
- `POST /api/director/chat`
- `POST /api/director/operator`

## Backward compatibility

These routes still work and map to default performer (`nova`):
- `POST /api/respond`
- `POST /api/respond-only`
- `GET /api/ai/status`
- `GET /api/persona`
- `POST /api/persona`

Legacy overlay consumers still receive compatible state via `state.sync.legacy` while new multi-performer state is included in `state.sync`.

## Environment

Copy `.env.example` to `.env`.

### New multi-performer VTube Studio config

```bash
VTS_NOVA_WS_URL=ws://127.0.0.1:8001
VTS_NOVA_AUTH_TOKEN=
VTS_NOVA_HOTKEY_HAPPY=happy
...

VTS_ECHO_WS_URL=ws://127.0.0.1:8002
VTS_ECHO_AUTH_TOKEN=
VTS_ECHO_HOTKEY_HAPPY=happy
...
```

If performer-specific vars are missing, controller falls back to existing single-performer `VTS_*` vars.

## Banter behavior (v1)

- `POST /api/director/banter/start` starts an async banter loop.
- Loop alternates speakers and can run indefinitely.
- `POST /api/director/chat` and `/api/director/operator` interrupt quickly and preempt turns.
- `POST /api/director/banter/stop` ends loop gracefully.
- If a generated intent has `shouldSpeak=false`, director swaps turn and continues (no deadlock).

## Local run

```bash
npm install
npm run -w @vtuber/controller dev
npm run -w @vtuber/overlay dev
```
