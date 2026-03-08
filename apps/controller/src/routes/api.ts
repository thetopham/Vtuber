import { Router } from 'express';
import {
  emotionSetSchema,
  speakingSetSchema,
  statusSetSchema,
  subtitleSetSchema,
  type ControllerEvent,
  type EventPayloadMap
} from '@vtuber/shared';
import type { EventBus } from '../eventBus.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createApiRouter(eventBus: EventBus): Router {
  const router = Router();

  const publish = (event: ControllerEvent) => {
    eventBus.emit(event);
    return event;
  };

  router.post('/subtitle', (req, res) => {
    const parsed = subtitleSetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    return res.json({ ok: true, event: publish({ type: 'subtitle.set', payload: parsed.data, timestamp: new Date().toISOString() }) });
  });

  router.post('/speaking', (req, res) => {
    const parsed = speakingSetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    return res.json({ ok: true, event: publish({ type: 'speaking.set', payload: parsed.data, timestamp: new Date().toISOString() }) });
  });

  router.post('/emotion', (req, res) => {
    const parsed = emotionSetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    return res.json({ ok: true, event: publish({ type: 'emotion.set', payload: parsed.data, timestamp: new Date().toISOString() }) });
  });

  router.post('/status', (req, res) => {
    const parsed = statusSetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    return res.json({ ok: true, event: publish({ type: 'status.set', payload: parsed.data, timestamp: new Date().toISOString() }) });
  });

  router.post('/test-sequence', async (_req, res) => {
    const testFrames: Array<{ subtitle: string; emotion: EventPayloadMap['emotion.set']['emotion'] }> = [
      { subtitle: 'Boot sequence online.', emotion: 'thinking' },
      { subtitle: 'Hello chat! I am ready to stream.', emotion: 'happy' },
      { subtitle: 'Enemy spotted... focus mode.', emotion: 'angry' },
      { subtitle: 'We can recover from that.', emotion: 'sad' },
      { subtitle: 'Wait, what was THAT?', emotion: 'surprised' },
      { subtitle: 'Back to neutral and stable.', emotion: 'neutral' }
    ];

    for (const frame of testFrames) {
      publish({ type: 'speaking.set', payload: { speaking: true }, timestamp: new Date().toISOString() });
      publish({ type: 'subtitle.set', payload: { subtitle: frame.subtitle }, timestamp: new Date().toISOString() });
      publish({ type: 'emotion.set', payload: { emotion: frame.emotion }, timestamp: new Date().toISOString() });
      await delay(1200);
      publish({ type: 'speaking.set', payload: { speaking: false }, timestamp: new Date().toISOString() });
      await delay(400);
    }

    return res.json({ ok: true, message: 'Test sequence complete.' });
  });

  return router;
}
