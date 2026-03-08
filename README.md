# AI VTuber Controller MVP (Local-first)

A TypeScript monorepo MVP that provides:

- **Controller backend** (Express + WebSocket) as the local brain/control layer.
- **Overlay frontend** (React + Vite) designed for OBS Browser Source.
- **Shared package** with strong typing + Zod schemas.
- **VTube Studio adapter stub** ready for future API integration.

## Monorepo structure

```text
/apps
  /overlay      React overlay UI rendered in OBS Browser Source
  /controller   Express + WebSocket controller service
/packages
  /shared       Shared event schema/types/constants/config
```

## What each app does

### `@vtuber/controller`
- Exposes REST testing APIs:
  - `POST /api/subtitle`
  - `POST /api/speaking`
  - `POST /api/emotion`
  - `POST /api/status`
  - `POST /api/test-sequence`
- Broadcasts validated events over WebSocket (`/ws` by default).
- Stores live overlay state in memory.
- Logs incoming events.
- Includes event bus abstraction.
- Includes **VTube Studio integration stub** with TODO markers.

### `@vtuber/overlay`
- Fullscreen transparent React overlay.
- Displays:
  - Character name
  - Subtitle box (bottom center)
  - Speaking indicator
  - Emotion badge
  - Optional debug panel
- Connects via WebSocket to controller.
- Includes a small local browser testing page at `/test.html`.

### `@vtuber/shared`
- Typed event schema + payload maps.
- Zod validation schemas.
- Shared constants (emotion set + default state).

## Prerequisites

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

## Run everything in dev mode

```bash
npm run dev
```

Default URLs:
- Overlay: `http://localhost:5173`
- Overlay test page: `http://localhost:5173/test.html`
- Controller health: `http://localhost:8787/health`

## Environment variables

Copy and adjust env values:

```bash
cp .env.example .env
```

Controller reads `.env` from repo root by default.
Overlay can use `VITE_CONTROLLER_PORT`.

## OBS Browser Source setup

1. In OBS, add a new **Browser Source**.
2. Set URL to `http://localhost:5173`.
3. Set Width/Height to your stream resolution (e.g. `1920x1080`).
4. Enable **Shutdown source when not visible** = OFF (recommended).
5. Enable **Refresh browser when scene becomes active** = ON (optional, useful during dev).
6. Ensure source background is transparent (overlay is styled for transparency).

## Example curl commands

```bash
curl -X POST http://localhost:8787/api/subtitle \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello stream!", "characterName":"Nova"}'

curl -X POST http://localhost:8787/api/speaking \
  -H "Content-Type: application/json" \
  -d '{"speaking":true}'

curl -X POST http://localhost:8787/api/emotion \
  -H "Content-Type: application/json" \
  -d '{"emotion":"happy"}'

curl -X POST http://localhost:8787/api/status \
  -H "Content-Type: application/json" \
  -d '{"status":"Live and monitoring chat"}'

curl -X POST http://localhost:8787/api/test-sequence \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Notes for next phase

- Add real LLM-driven response orchestration.
- Add TTS output pipeline.
- Add Twitch chat ingestion.
- Add screenshot/screen-analysis event ingestion.
- Implement real VTube Studio WebSocket auth + expression/hotkey triggers.
- Add scene automation and richer timeline sequencing.
