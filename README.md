# AI VTuber Controller MVP (Local-first)

This monorepo currently focuses on:

- OBS overlay transport (`apps/overlay`)
- Controller APIs (`apps/controller`)
- Shared event/type contracts (`packages/shared`)
- **VTube Studio expression control (base + overlays)**

## VTube Studio setup

1. Open **VTube Studio**.
2. Enable API access: **Settings → General → Allow Plugin API access**.
3. Ensure VTS WebSocket server is available at `ws://127.0.0.1:8001` (or set `VTS_WS_URL`).
4. Create VTS hotkeys on your loaded model with these IDs/names:
   - `happy`
   - `angry`
   - `approval`
   - `embarrassed`
   - `excited`
   - `sad`
   - `shocked`
   - `wink`
5. Run controller and approve plugin auth request the first time.

## Emotion mapping used by this repo

Internal emotion inputs:

- `neutral`
- `happy`
- `angry`
- `pouting`
- `embarrassed`
- `excited`
- `sad`
- `shocked`
- `wink`

Mapping rules:

- `neutral` → base `happy`
- `happy` → base `happy`
- `angry` → base `angry`
- `pouting` → base `approval`
- `embarrassed` → base `happy` + overlay `embarrassed`
- `excited` → base `excited`
- `sad` → base `sad`
- `shocked` → base `shocked` (auto-clears to happy)
- `wink` → base `happy` + overlay `wink`

Expression apply rule:

1. Clear active expressions
2. Apply `happy` reset/default
3. Apply requested base + overlays

Overlay auto-clear timers:

- `wink`: ~1000ms
- `embarrassed`: ~3000ms
- `shocked`: ~2500ms (base fallback to happy)

## API endpoints (avatar)

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

1. Start VTube Studio and load model.
2. Start controller: `npm run dev:controller`.
3. Call `/api/avatar/emotion` with `happy`, `angry`, and `pouting`.
4. Call `/api/avatar/emotion` with `wink` and verify it auto-clears.
5. Call `/api/avatar/test-cycle` and watch the full sequence.
6. Call `/api/avatar/status` and verify connection/auth/current state.

## Next follow-up PR

- Add TTS-aligned expression timing sync.
- Add LLM-driven intent-to-emotion orchestration.
- Expand combo planner for richer base+overlay blends.

## Environment variables

```bash
cp .env.example .env
```

- `CONTROLLER_PORT` (default `8787`)
- `WS_PATH` (default `/ws`)
- `CORS_ORIGIN` (default `*`)
- `VTS_WS_URL` (default `ws://127.0.0.1:8001`)
- `VTS_PLUGIN_NAME`
- `VTS_PLUGIN_DEVELOPER`
