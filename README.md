# AI VTuber Controller MVP (Local-First)

Monorepo starter for a custom AI VTuber control layer that connects OBS (overlay) to a local controller backend and leaves clean extension points for VTube Studio, LLMs, TTS, and Twitch.

## Project layout

- `apps/overlay` – React + Vite fullscreen overlay for OBS Browser Source.
- `apps/controller` – Node + Express + WebSocket controller backend.
- `packages/shared` – shared event types, constants, and Zod schemas.

## What this MVP does

- Browser-source-friendly overlay with transparent background.
- Live subtitle updates over WebSocket.
- Speaking indicator + emotion badge + character label.
- Debug panel toggle for runtime state visibility.
- REST endpoints to trigger events quickly.
- In-memory state snapshot for reconnecting overlays.
- Event bus abstraction for future modular integrations.
- VTube Studio adapter/service stubs with TODO markers.

## Quick start

### 1) Install

```bash
npm install
```

### 2) Run everything in dev mode

```bash
npm run dev
```

This starts:
- Overlay: `http://localhost:5173`
- Overlay test page: `http://localhost:5173/test.html`
- Controller: `http://localhost:8787`

### 3) Optional env setup

Copy `.env.example` values into `apps/controller/.env` (controller currently loads env from its own process env).

## OBS Browser Source setup

1. Open OBS → add a new **Browser Source**.
2. URL: `http://127.0.0.1:5173`
3. Width/Height: match your canvas (e.g. `1920x1080`).
4. Enable **Shutdown source when not visible** (optional for resource savings).
5. Enable **Refresh browser when scene becomes active**.
6. Make sure source background is transparent (overlay already uses transparent HTML/body).

## API endpoints (controller)

- `POST /api/subtitle` body: `{ "subtitle": "hello" }`
- `POST /api/speaking` body: `{ "speaking": true }`
- `POST /api/emotion` body: `{ "emotion": "happy" }`
- `POST /api/status` body: `{ "status": "Live" }`
- `POST /api/test-sequence` body: `{}`

## Example curl commands

```bash
curl -X POST http://localhost:8787/api/subtitle \
  -H 'Content-Type: application/json' \
  -d '{"subtitle":"Hello from curl"}'

curl -X POST http://localhost:8787/api/speaking \
  -H 'Content-Type: application/json' \
  -d '{"speaking":true}'

curl -X POST http://localhost:8787/api/emotion \
  -H 'Content-Type: application/json' \
  -d '{"emotion":"thinking"}'

curl -X POST http://localhost:8787/api/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"Analyzing next move"}'

curl -X POST http://localhost:8787/api/test-sequence \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Next-phase extension points

- `apps/controller/src/services/vtubeStudio.ts`
  - TODOs for VTube Studio WS connect/auth, hotkeys, expression sync.
- `apps/controller/src/adapters/AvatarAdapter.ts`
  - swap avatar backends later.
- `packages/shared`
  - central typed event contracts for future AI/TTS/chat services.

## Non-goals in this MVP

- No DB/auth.
- No real AI calls.
- No real TTS.
- No Twitch/chat integration.
- No screenshot/screen-analysis integration yet.
