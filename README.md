# AI VTuber Controller Monorepo

This repo contains the controller service, OBS overlay, and shared package for a local-first VTuber stack.

## Monorepo structure

```text
/apps
  /controller   Express + WebSocket controller service
  /overlay      React overlay UI rendered in OBS Browser Source
/packages
  /shared       Shared event schema/types/constants/config
```

## Focus of this PR

This iteration adds **VTube Studio expression control only**:
- Internal emotion normalization and expression mapping
- VTube Studio WebSocket adapter (auth + hotkey trigger flow)
- Expression planning with base + overlay rules
- Avatar test endpoints

Non-goals in this PR:
- No TTS
- No OpenAI/LLM orchestration
- No Twitch chat
- No screen capture / scene automation

## Install

```bash
npm install
```

## Run in dev mode

```bash
npm run dev
```

Default URLs:
- Overlay: `http://localhost:5173`
- Controller health: `http://localhost:8787/health`

## Environment variables

```bash
cp .env.example .env
```

Set VTube Studio values in `.env`, especially:
- `VTS_WS_URL`
- `VTS_AUTH_TOKEN` (optional; will request token if missing)
- `VTS_HOTKEY_*` values for expression hotkey IDs

## VTube Studio setup

1. Open VTube Studio.
2. Enable the Public API plugin access.
3. Create hotkeys for each model expression used in this repo:
   - `happy`
   - `angry`
   - `approval` (used internally as pouting)
   - `embarrassed`
   - `excited`
   - `sad`
   - `shocked`
   - `wink`
4. Set each hotkey ID in `.env` (`VTS_HOTKEY_*`).
5. Start controller and approve API access when prompted.

## Emotion mapping used by this repo

Internal emotions:
- `neutral`, `happy`, `angry`, `pouting`, `embarrassed`, `excited`, `sad`, `shocked`, `wink`

Mapping to model expressions:
- `neutral` → base `happy`, overlays `[]`
- `happy` → base `happy`, overlays `[]`
- `angry` → base `angry`
- `pouting` → base `approval`
- `embarrassed` → base `happy` + overlay `embarrassed`
- `excited` → base `excited`
- `sad` → base `sad`
- `shocked` → base `shocked`
- `wink` → base `happy` + overlay `wink`

Rules:
- One base expression at a time
- Allowed overlays in v1: `embarrassed`, `wink`
- Valid combos in v1:
  - `happy + embarrassed`
  - `happy + wink`
  - `excited + embarrassed`
  - `shocked + embarrassed`
- Reset behavior before each apply:
  1. clear active expressions
  2. apply `happy` default
  3. apply requested base + overlays
- Auto-clear timing:
  - `wink`: ~1000ms
  - `embarrassed`: ~3000ms
  - `shocked` base: ~2500ms (auto-reset to happy)

## API endpoints

- `POST /api/avatar/emotion`
- `POST /api/avatar/expression`
- `POST /api/avatar/test-cycle`
- `GET /api/avatar/status`

Legacy overlay endpoints are still available:
- `POST /api/subtitle`
- `POST /api/speaking`
- `POST /api/status`
- `POST /api/emotion`

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

1. Confirm `GET /api/avatar/status` shows controller connection/auth state.
2. Trigger `POST /api/avatar/emotion` with `pouting` and confirm `approval` hotkey runs.
3. Trigger `POST /api/avatar/expression` with `{ "base": "happy", "overlays": ["wink"] }` and confirm wink clears after ~1s.
4. Trigger `POST /api/avatar/expression` with `{ "base": "excited", "overlays": ["wink"] }` and confirm invalid combo is rejected in logs.
5. Run `POST /api/avatar/test-cycle` and observe each mapped emotion in order.

## Next follow-up PR

- Persist VTube Studio auth token automatically to `.env.local` or secure local store.
- Add stronger response correlation + retry handling for WebSocket requests.
- Extend combo planner for richer layered expressions.
- Integrate expression timing with future TTS timeline events.
