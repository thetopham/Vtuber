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

## VTube Studio expression control (this PR)

This repo now includes a focused v1 expression system:
- Internal emotion input normalization.
- Emotion-to-expression mapping.
- VTube Studio WebSocket adapter with auth + hotkey triggering.
- Test endpoints for quick expression validation.

### Enable VTube Studio API

1. Open **VTube Studio**.
2. Go to **Settings → General → Allow Plugin API access** (wording may vary by version).
3. Confirm WebSocket API is listening (default `ws://127.0.0.1:8001`).
4. On first controller connect, approve the plugin prompt in VTube Studio.

### Create model hotkeys

Create hotkeys in VTube Studio for these model expressions:
- `happy` (default/reset)
- `angry`
- `approval` (used internally as pouting)
- `excited`
- `sad`
- `shocked`
- `embarrassed`
- `wink`

Set matching IDs in `.env` (`VTS_HOTKEY_*`).

### Internal emotion mapping

| Internal emotion | VTS base | Overlays |
|---|---|---|
| neutral | happy | none |
| happy | happy | none |
| angry | angry | none |
| pouting | approval | none |
| embarrassed | happy | embarrassed |
| excited | excited | none |
| sad | sad | none |
| shocked | shocked | none |
| wink | happy | wink |

Rules:
- One base expression at a time.
- v1 overlays allowed: `embarrassed`, `wink`.
- Allowed base+overlay combos: `happy+embarrassed`, `happy+wink`, `excited+embarrassed`, `shocked+embarrassed`.
- Reset behavior before apply: clear all → apply `happy` → apply target base/overlays.

Auto-clear timing:
- `wink`: ~1000ms
- `embarrassed`: ~3000ms
- `shocked` (optional simple behavior): ~2500ms back to happy

## API endpoints

### Existing overlay endpoints
- `POST /api/subtitle`
- `POST /api/speaking`
- `POST /api/status`

### New avatar endpoints
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

1. Start VTube Studio with API enabled and model loaded.
2. Start controller (`npm run dev`).
3. Check `/api/avatar/status` returns connected/authenticated.
4. Trigger `/api/avatar/emotion` with `pouting`, `embarrassed`, and `wink`.
5. Trigger `/api/avatar/test-cycle` and verify transitions + auto-clear timings.

## Next follow-up PR

- Add TTS-aligned expression timing.
- Add LLM orchestration that outputs structured emotion/expression intent.
- Expand combo planning and transition smoothing.
- Add richer state introspection for debugging timeline playback.

## Non-goals in this PR

- No TTS pipeline.
- No OpenAI/LLM integration.
- No Twitch chat ingestion.
- No screen capture or scene automation.
