import cors from "cors";
import express from "express";
import http from "node:http";
import {
  avatarExpressionStateSchema,
  eventSchemas,
  makeEvent,
  parseEvent,
  type EventName,
  type EventPayloadMap,
  type OverlayEvent,
  type OverlayState
} from "@vtuber/shared";
import { WebSocketServer } from "ws";
import { z } from "zod";
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

const avatarEmotionRequestSchema = z.object({
  emotion: z.string().min(1)
});

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

function bindValidatedRoute<T extends EventName>(path: string, type: T): void {
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

app.post("/api/avatar/emotion", async (req, res) => {
  const payload = avatarEmotionRequestSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ error: "Invalid emotion", details: payload.error.flatten() });
  }

  let emotion;
  try {
    emotion = vtubeStudio.normalizeEmotionInput(payload.data.emotion);
  } catch (error) {
    return res.status(400).json({ error: "Invalid emotion", details: String(error) });
  }

  currentState = patchState(currentState, { emotion });
  await vtubeStudio.setEmotion(emotion);

  return res.json({ ok: true, emotion, expression: vtubeStudio.buildExpressionState(emotion) });
});

app.post("/api/avatar/expression", async (req, res) => {
  const result = avatarExpressionStateSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid expression state",
      details: result.error.flatten()
    });
  }

  const state = await vtubeStudio.applyExpressionState(result.data);
  return res.json({ ok: true, state });
});

app.post("/api/avatar/test-cycle", async (_req, res) => {
  const sequence = [
    "neutral",
    "angry",
    "pouting",
    "embarrassed",
    "excited",
    "happy",
    "sad",
    "shocked",
    "wink"
  ] as const;

  sequence.forEach((emotion, index) => {
    setTimeout(async () => {
      currentState = patchState(currentState, { emotion });
      await vtubeStudio.setEmotion(emotion);
    }, index * 1800);
  });

  return res.json({ ok: true, sequence });
});

app.get("/api/avatar/status", (_req, res) => {
  return res.json({ ok: true, avatar: vtubeStudio.getStatus() });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, state: currentState });
});

server.listen(env.port, async () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);
  await vtubeStudio.connect();
});
