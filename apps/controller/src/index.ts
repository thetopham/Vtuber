import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { WebSocketServer } from 'ws';
import { SocketEnvelopeSchema, envSchema } from '@vtuber/shared';
import { createServer } from 'node:http';
import { EventBus } from './eventBus.js';
import { createApiRouter } from './routes/api.js';
import { StateStore } from './state.js';
import { VTubeStudioService } from './services/vtubeStudio.js';

const env = envSchema.parse(process.env);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const eventBus = new EventBus();
const stateStore = new StateStore();
const vtubeStudio = new VTubeStudioService();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use('/api', createApiRouter(eventBus));

app.get('/health', (_req, res) => {
  res.json({ ok: true, state: stateStore.getState() });
});

const broadcast = (payload: unknown) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', (socket) => {
  socket.send(JSON.stringify(stateStore.makeSnapshot()));
});

eventBus.onAny(async (event) => {
  console.log(`[event] ${event.type}`, event.payload);

  const appliedEvent = stateStore.applyEvent(event);
  const validated = SocketEnvelopeSchema.parse(appliedEvent);
  broadcast(validated);

  if (event.type === 'speaking.set') {
    await vtubeStudio.setSpeaking(event.payload.speaking);
  }

  if (event.type === 'emotion.set') {
    await vtubeStudio.setEmotion(event.payload.emotion);
  }
});

const start = async () => {
  await vtubeStudio.connect();

  server.listen(env.CONTROLLER_PORT, () => {
    console.log(`Controller listening on http://localhost:${env.CONTROLLER_PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${env.CONTROLLER_PORT}`);
  });
};

void start();
