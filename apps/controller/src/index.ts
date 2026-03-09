import cors from "cors";
import express from "express";
import http from "node:http";
import { z } from "zod";
import {
  eventSchemas,
  makeEvent,
  parseEvent,
  type EventName,
  type EventPayloadMap,
  type InternalEmotion,
  type OverlayEvent,
  type OverlayState,
  avatarExpressionStateSchema,
  internalEmotionSchema
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
const vtubeStudio = new VTubeStudioService(
  env.vtsWsUrl,
  env.vtsPluginName,
  env.vtsPluginDeveloper
);

let currentState: OverlayState = createInitialState();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

const emotionRequestSchema = z.object({ emotion: internalEmotionSchema });
const expressionRequestSchema = avatarExpressionStateSchema;

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

eventBus.on("subtitle.set", ({ text, characterName }) => {
  currentState = patchState(currentState, {
    subtitle: text,
    ...(characterName ? { characterName } : {})
  });
});

eventBus.on("speaking.set", ({ speaking }) => {
  currentState = patchState(currentState, { speaking });
});

eventBus.on("emotion.set", ({ emotion }) => {
  currentState = patchState(currentState, { emotion });
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
bindValidatedRoute("/api/status", "status.set");

app.post("/api/avatar/emotion", async (req, res) => {
  const parsed = emotionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const expressionState = await vtubeStudio.applyEmotion(parsed.data.emotion);
  const emotionForOverlay = parsed.data.emotion as InternalEmotion;
  publish("emotion.set", { emotion: emotionForOverlay });

  return res.json({ ok: true, expressionState, state: currentState });
});

app.post("/api/avatar/expression", async (req, res) => {
  const parsed = expressionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const expressionState = await vtubeStudio.applyExpressionState(parsed.data);
  return res.json({ ok: true, expressionState, state: currentState });
});

app.post("/api/avatar/test-cycle", (_req, res) => {
  const cycle: InternalEmotion[] = [
    "neutral",
    "angry",
    "pouting",
    "embarrassed",
    "excited",
    "happy",
    "sad",
    "shocked",
    "wink"
  ];

  cycle.forEach((emotion, index) => {
    setTimeout(async () => {
      const expressionState = await vtubeStudio.applyEmotion(emotion);
      publish("emotion.set", { emotion });
      console.info("[avatar] test-cycle step", { emotion, expressionState });
    }, index * 1800);
  });

  return res.json({ ok: true, message: "Avatar cycle started", cycle });
});

app.get("/api/avatar/status", (_req, res) => {
  res.json({ ok: true, avatar: vtubeStudio.getStatus(), state: currentState });
});

app.post("/api/emotion", async (req, res) => {
  const result = eventSchemas["emotion.set"].safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid payload", details: result.error.flatten() });
  }

  await vtubeStudio.applyEmotion(result.data.emotion);
  publish("emotion.set", parseEvent("emotion.set", result.data));
  return res.json({ ok: true, state: currentState });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, state: currentState });
});

server.listen(env.port, async () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);
  await vtubeStudio.connect();
});
