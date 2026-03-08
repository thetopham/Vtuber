# AI VTuber Controller MVP (Local-First)

A monorepo starter for a **custom AI VTuber control layer** that works with your existing OBS + VTube Studio setup.

## Monorepo layout

```txt
/apps
  /overlay      React + Vite OBS browser overlay
  /controller   Node + Express + WebSocket controller
/packages
  /shared       Shared event types, zod schemas, constants
```

## What each app does

### `apps/controller`
- Receives REST test commands.
- Validates payloads with shared Zod schemas.
- Stores current overlay state in memory.
- Broadcasts events and full state snapshots to all overlay clients over WebSocket.
- Includes a simple event bus and VTube Studio adapter stub for future implementation.

### `apps/overlay`
- OBS-friendly transparent fullscreen React overlay.
- Renders character name, subtitle bar, speaking indicator, emotion badge.
- Optional debug panel with connection and state details.
- Connects to controller via WebSocket and updates live.

### `packages/shared`
- Typed event map + outbound message schema.
- Input validation schemas used by controller.
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
- Controller: `http://localhost:4000`
- Overlay: `http://localhost:5173`

## Environment

Copy `.env.example` to `.env` and adjust values if needed.

```bash
cp .env.example .env
```

## Open the overlay in browser

- Main overlay: `http://localhost:5173`
- Demo control mode: `http://localhost:5173/?demo=1`

## Add overlay to OBS Browser Source

1. In OBS, add **Browser Source**.
2. Set URL to `http://localhost:5173`.
3. Set width/height to your canvas size (for example `1920x1080`).
4. Enable **Shutdown source when not visible** OFF for fastest reconnect behavior.
5. Enable **Refresh browser when scene becomes active** ON if you want deterministic resets.

## API test commands (curl)

```bash
curl -X POST http://localhost:4000/api/subtitle \
  -H 'Content-Type: application/json' \
  -d '{"text":"Chat, we are live!"}'

curl -X POST http://localhost:4000/api/speaking \
  -H 'Content-Type: application/json' \
  -d '{"speaking":true}'

curl -X POST http://localhost:4000/api/emotion \
  -H 'Content-Type: application/json' \
  -d '{"emotion":"happy"}'

curl -X POST http://localhost:4000/api/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"on-air"}'

curl -X POST http://localhost:4000/api/test-sequence
```

## MVP architecture notes

- Local-first, no DB/auth yet.
- Event-driven flow from controller to overlays.
- Shared package keeps schemas and event contracts consistent.
- Adapter pattern already prepared for future VTube Studio API wiring.

## Next-phase TODO targets

- Add LLM orchestration service (OpenAI/other providers).
- Add TTS pipeline (queued synthesis + playback controls).
- Add Twitch chat input adapters.
- Add screen capture / screenshot analysis workers.
- Implement VTube Studio WebSocket auth, expression triggers, and state sync.
