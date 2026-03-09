import cors from "cors";
import express from "express";
import http from "node:http";
import {
  avatarEmotionRequestSchema,
  avatarExpressionRequestSchema,
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
import { createInitialState, patchState } from "./state";
import { VTubeStudioService } from "./services/vtubeStudio";

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

function bindValidatedRoute(path: string, type: EventName): void {
  app.post(path, (req, res) => {
    const result = eventSchemas[type].safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ error: "Invalid payload", details: result.error.flatten() });
    }

    publish(type, parseEvent(type, result.data));
    return res.json({ ok: true, state: currentState });
  });
}

bindValidatedRoute("/api/subtitle", "subtitle.set");
bindValidatedRoute("/api/speaking", "speaking.set");
bindValidatedRoute("/api/status", "status.set");

app.post("/api/emotion", async (req, res) => {
  const result = avatarEmotionRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid payload", details: result.error.flatten() });
  }

  const expressionState = await vtubeStudio.applyEmotion(result.data.emotion);
  publish("emotion.set", { emotion: result.data.emotion });
  return res.json({ ok: true, state: currentState, expressionState });
});

app.post("/api/avatar/emotion", async (req, res) => {
  const result = avatarEmotionRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid payload", details: result.error.flatten() });
  }

  const expressionState = await vtubeStudio.applyEmotion(result.data.emotion);
  publish("emotion.set", { emotion: result.data.emotion });
  return res.json({ ok: true, state: currentState, expressionState });
});

app.post("/api/avatar/expression", async (req, res) => {
  const result = avatarExpressionRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid payload", details: result.error.flatten() });
  }

  const expressionState = await vtubeStudio.applyExpressionState(result.data);
  const inferredEmotion = (result.data.overlays.includes("wink")
    ? "wink"
    : result.data.overlays.includes("embarrassed")
      ? "embarrassed"
      : result.data.base === "approval"
        ? "pouting"
        : result.data.base) as EventPayloadMap["emotion.set"]["emotion"];
  publish("emotion.set", { emotion: inferredEmotion });

  return res.json({ ok: true, expressionState, state: currentState });
});

app.post("/api/avatar/test-cycle", async (_req, res) => {
  await vtubeStudio.runTestCycle();
  return res.json({ ok: true, message: "Avatar test cycle started" });
});

app.get("/api/avatar/status", (_req, res) => {
  return res.json({ ok: true, vtubeStudio: vtubeStudio.getStatus(), state: currentState });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, state: currentState });
});

server.listen(env.port, async () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);
  try {
    await vtubeStudio.connect();
  } catch (error) {
    console.warn("[startup] VTube Studio connect failed; API endpoints still available", error);
  }
});
