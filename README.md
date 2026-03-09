# AI VTuber Controller MVP (Local-first)

This monorepo currently focuses on **controller + OBS overlay + VTube Studio expression control**.

## Monorepo structure

```text
/apps
  /overlay      React overlay UI rendered in OBS Browser Source
  /controller   Express + WebSocket controller service
/packages
  /shared       Shared event schema/types/constants/config
```

## VTube Studio expression support (v1)

Internal emotions supported:

- neutral
- happy
- angry
- pouting
- embarrassed
- excited
- sad
- shocked
- wink

Expression mapping:

- neutral -> base `happy`, no overlays
- happy -> base `happy`, no overlays
- angry -> base `angry`
- pouting -> base `approval`
- embarrassed -> base `happy` + overlay `embarrassed`
- excited -> base `excited`
- sad -> base `sad`
- shocked -> base `shocked`
- wink -> base `happy` + overlay `wink`

Rules:

- Exactly one base expression is active at a time.
- Overlays allowed: `embarrassed`, `wink`.
- Reset behavior before each apply:
  1. clear expressions
  2. set `happy`
  3. apply requested base + overlays
- Timer behavior:
  - `wink` auto-clears after ~1000ms
  - `embarrassed` auto-clears after ~3000ms
  - `shocked` auto-clears to happy after ~2500ms

## Prerequisites

- Node.js 20+
- npm 10+
- VTube Studio running locally
- VTube Studio API enabled

## Install

```bash
npm install
cp .env.example .env
```

## Run in dev

```bash
npm run dev
```

Default URLs:

- Overlay: `http://localhost:5173`
- Overlay test page: `http://localhost:5173/test.html`
- Controller health: `http://localhost:8787/health`

## VTube Studio API setup

1. Open **VTube Studio**.
2. Go to **Settings → General → API** and enable API access.
3. Confirm websocket endpoint is reachable (default `ws://127.0.0.1:8001`).
4. On first controller connect, approve plugin auth in VTube Studio.

## Hotkey setup in VTube Studio

Create hotkeys in VTube Studio with IDs exactly matching expression names:

- `happy`
- `angry`
- `approval`
- `excited`
- `sad`
- `shocked`
- `embarrassed`
- `wink`

The controller triggers these hotkeys only.

## API endpoints

### Existing overlay endpoints

- `POST /api/subtitle`
- `POST /api/speaking`
- `POST /api/emotion`
- `POST /api/status`

### Avatar expression endpoints

- `POST /api/avatar/emotion`
- `POST /api/avatar/expression`
- `POST /api/avatar/test-cycle`
- `GET /api/avatar/status`

## Example curl commands

```bash
curl -X POST http://localhost:8787/api/avatar/emotion \
  -H "Content-Type: application/json" \
  -d '{"emotion":"embarrassed"}'

curl -X POST http://localhost:8787/api/avatar/expression \
  -H "Content-Type: application/json" \
  -d '{"base":"happy","overlays":["wink"]}'

curl -X POST http://localhost:8787/api/avatar/test-cycle \
  -H "Content-Type: application/json" \
  -d '{}'

curl http://localhost:8787/api/avatar/status
```

## What to test first

1. Start VTube Studio + enable API.
2. Run controller and verify logs show connect/auth success.
3. Call `/api/avatar/emotion` with `neutral`, `pouting`, `embarrassed`, `wink`.
4. Verify timed auto-clear for `wink`, `embarrassed`, and `shocked`.
5. Call `/api/avatar/test-cycle` and verify full sequence.

## Next follow-up PR

- Add richer combo planner with priority overlays.
- Add speaking/lip-sync specific adapter hooks.
- Add queueing so expression transitions can be scheduled without overlap.

## Non-goals in this PR

- No TTS pipeline
- No LLM orchestration
- No Twitch chat ingestion
- No screen capture/analysis
- No scene automation
