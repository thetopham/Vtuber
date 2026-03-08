import cors from "cors";
import express from "express";
import http from "node:http";
import {
  eventSchemas,
  makeEvent,
  parseEvent,
  type EventName,
  type EventPayloadMap,
  type OverlayEvent,
  type OverlayState
} from "@vtuber/shared";
import { WebSocketServer } from "ws";
import { EventBus } from "./eventBus";
import { env } from "./env";
import { VTubeStudioService } from "./services/vtubeStudio";
import { createInitialState, patchState } from "./state";

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: env.wsPath });
const eventBus = new EventBus();
const vtubeStudio = new VTubeStudioService();

let currentState: OverlayState = createInitialState();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

function logEvent<T extends EventName>(type: T, payload: EventPayloadMap[T]): void {
  console.info(`[event] ${type}`, payload);
}

function broadcast(event: OverlayEvent): void {
  const serialized = JSON.stringify(event);
  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(serialized);
    }
  });
}

function publish<T extends EventName>(type: T, payload: EventPayloadMap[T]): void {
  logEvent(type, payload);
  eventBus.emit(type, payload);
  broadcast(makeEvent(type, payload));
}

eventBus.on("subtitle.set", async ({ text, characterName }) => {
  currentState = patchState(currentState, {
    subtitle: text,
    ...(characterName ? { characterName } : {})
  });
  await vtubeStudio.syncState(currentState);
});

eventBus.on("speaking.set", async ({ speaking }) => {
  currentState = patchState(currentState, { speaking });
  await vtubeStudio.setSpeaking(speaking);
});

eventBus.on("emotion.set", async ({ emotion }) => {
  currentState = patchState(currentState, { emotion });
  await vtubeStudio.setEmotion(emotion);
});

eventBus.on("status.set", ({ status }) => {
  currentState = patchState(currentState, { status });
});

eventBus.on("scene.set", ({ scene }) => {
  currentState = patchState(currentState, { scene });
});

wsServer.on("connection", (socket) => {
  console.info("[ws] overlay connected");
  socket.send(JSON.stringify(makeEvent("state.sync", currentState)));

  socket.on("close", () => {
    console.info("[ws] overlay disconnected");
  });
});

function bindValidatedRoute<T extends EventName>(
  path: string,
  type: T
): void {
  app.post(path, (req, res) => {
    const result = eventSchemas[type].safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Invalid payload",
        details: result.error.flatten()
      });
    }

    publish(type, parseEvent(type, result.data));
    return res.json({ ok: true, state: currentState });
  });
}

bindValidatedRoute("/api/subtitle", "subtitle.set");
bindValidatedRoute("/api/speaking", "speaking.set");
bindValidatedRoute("/api/emotion", "emotion.set");
bindValidatedRoute("/api/status", "status.set");

app.post("/api/test-sequence", async (_req, res) => {
  const steps: Array<{ delay: number; type: EventName; payload: unknown }> = [
    {
      delay: 0,
      type: "status.set",
      payload: { status: "Running demo sequence" }
    },
    {
      delay: 300,
      type: "subtitle.set",
      payload: { text: "Hello chat, I am online.", characterName: "Nova" }
    },
    {
      delay: 700,
      type: "speaking.set",
      payload: { speaking: true }
    },
    {
      delay: 1300,
      type: "emotion.set",
      payload: { emotion: "happy" }
    },
    {
      delay: 2400,
      type: "subtitle.set",
      payload: { text: "Let me think about our next play..." }
    },
    {
      delay: 3100,
      type: "emotion.set",
      payload: { emotion: "thinking" }
    },
    {
      delay: 4200,
      type: "emotion.set",
      payload: { emotion: "surprised" }
    },
    {
      delay: 4700,
      type: "subtitle.set",
      payload: { text: "Wow! That was unexpected.", characterName: "Nova" }
    },
    {
      delay: 5600,
      type: "speaking.set",
      payload: { speaking: false }
    },
    {
      delay: 6000,
      type: "status.set",
      payload: { status: "Demo sequence complete" }
    }
  ];

  steps.forEach(({ delay, type, payload }) => {
    setTimeout(() => {
      const validated = parseEvent(type, payload);
      publish(type, validated);
    }, delay);
  });

  return res.json({ ok: true, message: "Demo sequence started" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, state: currentState });
});

server.listen(env.port, async () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);
  await vtubeStudio.connect();
});
