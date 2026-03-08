import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import {
  emotionPayloadSchema,
  outboundEventSchema,
  scenePayloadSchema,
  speakingPayloadSchema,
  statusPayloadSchema,
  subtitlePayloadSchema,
  type ControllerEventType,
  type OverlayState,
} from '@vtuber/shared';
import { EventBus } from './eventBus.js';
import { StateStore } from './state.js';
import { config } from './config.js';
import { VTubeStudioService } from './services/vtubeStudio.js';

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: '/ws' });
const bus = new EventBus();
const stateStore = new StateStore();
const avatarService = new VTubeStudioService();

app.use(cors());
app.use(express.json());

const clients = new Set<WebSocket>();

const logEvent = (type: ControllerEventType, payload: unknown) => {
  console.log(`[event] ${type}`, payload);
};

const broadcast = (type: ControllerEventType, payload: unknown) => {
  const packet = outboundEventSchema.parse({ type, payload });
  const encoded = JSON.stringify(packet);

  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(encoded);
    }
  }
};

const publishStateSnapshot = (state: OverlayState) => {
  broadcast('state.snapshot', state);
};

const applyUpdate = <T extends ControllerEventType>(
  type: T,
  payload: T extends 'state.snapshot' ? never : any,
  updater: () => OverlayState,
) => {
  logEvent(type, payload);
  bus.emit(type as never, payload);
  broadcast(type, payload);
  publishStateSnapshot(updater());
};

wsServer.on('connection', (socket) => {
  clients.add(socket);
  console.log('[ws] overlay connected. clients:', clients.size);

  publishStateSnapshot(stateStore.getState());

  socket.on('close', () => {
    clients.delete(socket);
    console.log('[ws] overlay disconnected. clients:', clients.size);
  });
});

bus.on('speaking.set', ({ speaking }) => {
  void avatarService.setSpeaking(speaking);
});

bus.on('emotion.set', ({ emotion }) => {
  void avatarService.setEmotion(emotion);
});

app.get('/health', (_, res) => {
  res.json({ ok: true, state: stateStore.getState() });
});

app.post('/api/subtitle', (req, res) => {
  const payload = subtitlePayloadSchema.parse(req.body);
  applyUpdate('subtitle.set', payload, () => stateStore.patch({ subtitle: payload.text }));
  res.status(202).json({ ok: true });
});

app.post('/api/speaking', (req, res) => {
  const payload = speakingPayloadSchema.parse(req.body);
  applyUpdate('speaking.set', payload, () => stateStore.patch({ speaking: payload.speaking }));
  res.status(202).json({ ok: true });
});

app.post('/api/emotion', (req, res) => {
  const payload = emotionPayloadSchema.parse(req.body);
  applyUpdate('emotion.set', payload, () => stateStore.patch({ emotion: payload.emotion }));
  res.status(202).json({ ok: true });
});

app.post('/api/status', (req, res) => {
  const payload = statusPayloadSchema.parse(req.body);
  applyUpdate('status.set', payload, () => stateStore.patch({ status: payload.status }));
  res.status(202).json({ ok: true });
});

app.post('/api/scene', (req, res) => {
  const payload = scenePayloadSchema.parse(req.body);
  applyUpdate('scene.set', payload, () => stateStore.patch({ scene: payload.scene }));
  res.status(202).json({ ok: true });
});

app.post('/api/test-sequence', async (_, res) => {
  const sequence = [
    { subtitle: 'Booting stream personality...', emotion: 'thinking', speaking: true },
    { subtitle: 'Hello chat! We are live.', emotion: 'happy', speaking: true },
    { subtitle: 'Scanning the battlefield...', emotion: 'surprised', speaking: false },
    { subtitle: 'No panic. We adapt.', emotion: 'neutral', speaking: true },
  ] as const;

  res.status(202).json({ ok: true, steps: sequence.length });

  for (const step of sequence) {
    applyUpdate('subtitle.set', { text: step.subtitle }, () => stateStore.patch({ subtitle: step.subtitle }));
    applyUpdate('emotion.set', { emotion: step.emotion }, () => stateStore.patch({ emotion: step.emotion }));
    applyUpdate('speaking.set', { speaking: step.speaking }, () => stateStore.patch({ speaking: step.speaking }));
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  applyUpdate('status.set', { status: 'demo.complete' }, () => stateStore.patch({ status: 'demo.complete' }));
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', error.message);
  res.status(400).json({ ok: false, error: error.message });
});

server.listen(config.port, config.host, async () => {
  await avatarService.connect();
  console.log(`[controller] listening on http://${config.host}:${config.port}`);
});
