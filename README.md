# AI VTuber Controller MVP (Local-first)

A TypeScript monorepo starter for a local AI VTuber control stack.

## Monorepo layout

```text
/apps
  /overlay      React + Vite OBS Browser Source overlay
  /controller   Node + Express + WebSocket controller server
/packages
  /shared       shared event types, zod schemas, constants
```

## What each app does

- **Overlay (`@vtuber/overlay`)**
  - Transparent, fullscreen React overlay for OBS Browser Source.
  - Renders subtitle box, character label, speaking indicator, emotion badge, status + scene.
  - Receives realtime updates via WebSocket.
  - Includes debug panel toggle.

- **Controller (`@vtuber/controller`)**
  - Express REST API + WebSocket broadcaster.
  - In-memory state store and event bus.
  - Validates incoming payloads with shared zod schemas.
  - Logs all incoming events.
  - Includes `/api/test-sequence` for demo playback.

- **Shared (`@vtuber/shared`)**
  - Typed event schema (`subtitle.set`, `speaking.set`, `emotion.set`, `status.set`, `scene.set`).
  - Zod validation schemas for REST and socket envelopes.
  - Emotion constants and default overlay state.

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Run everything in dev mode

```bash
npm run dev
```

This starts:
- Overlay at `http://localhost:5173`
- Controller API + WebSocket at `http://localhost:8787`

## Overlay usage

### Open in browser (local test page)

- Visit `http://localhost:5173`.
- Optional custom WebSocket URL query param:
  - `http://localhost:5173/?ws=ws://localhost:8787`

### Add to OBS Browser Source

1. In OBS, add **Source → Browser**.
2. Set URL to `http://localhost:5173`.
3. Set width/height to match your canvas (e.g. 1920x1080).
4. Enable **Shutdown source when not visible** (optional).
5. Keep **Refresh browser when scene becomes active** enabled for quick recovery.
6. Make sure source background is transparent in OBS (default with this overlay).

## API test commands (curl)

```bash
curl -X POST http://localhost:8787/api/subtitle \
  -H "Content-Type: application/json" \
  -d '{"subtitle":"Hello stream, systems online!","characterName":"Astra"}'

curl -X POST http://localhost:8787/api/speaking \
  -H "Content-Type: application/json" \
  -d '{"speaking":true}'

curl -X POST http://localhost:8787/api/emotion \
  -H "Content-Type: application/json" \
  -d '{"emotion":"happy"}'

curl -X POST http://localhost:8787/api/status \
  -H "Content-Type: application/json" \
  -d '{"status":"in-match"}'

curl -X POST http://localhost:8787/api/test-sequence
```

## Environment

Copy `.env.example` to `.env` and modify as needed.

```bash
cp .env.example .env
```

Variables:
- `CONTROLLER_PORT` (default `8787`)
- `CORS_ORIGIN` (default `*`)

## Architecture notes

- Event-driven flow: REST → event bus → state store + WebSocket broadcast.
- Overlay clients receive an initial `state.snapshot` on connect.
- No DB/auth/AI/TTS/Twitch yet (by design for MVP).

## VTube Studio integration stub

`apps/controller/src/services/vtubeStudio.ts` implements a placeholder adapter for future expansion.

TODO markers included for:
- connecting to VTube Studio WebSocket API
- triggering expressions/hotkeys
- syncing speaking/emotion state

The interface in `apps/controller/src/adapters/AvatarAdapter.ts` keeps avatar backends swappable.

## Next features (recommended)

1. Add OpenAI/LLM intent + response generation service.
2. Add local TTS service and audio routing controls.
3. Add Twitch chat ingestion + moderation pipeline.
4. Add screen capture analysis hooks and scene-aware reactions.
5. Add robust adapter implementation for VTube Studio websocket auth/hotkeys.
6. Add persistent settings + profile storage.

