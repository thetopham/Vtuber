import cors from "cors";
import express from "express";
import http from "node:http";
import {
  emotionInputSchema,
  expressionInputSchema,
  makeEvent,
  parseEvent,
  speechRequestSchema,
  type EventName,
  type EventPayloadMap,
  type OverlayEvent,
  type OverlayState
} from "@vtuber/shared";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { VTubeStudioAdapter } from "./adapters/VTubeStudioAdapter";
import { EventBus } from "./eventBus";
import { env } from "./env";
import { AudioPlaybackService } from "./services/AudioPlaybackService";
import { ExpressionEngine } from "./services/ExpressionEngine";
import { OpenAISpeechProvider } from "./services/OpenAISpeechProvider";
import { PerformanceLoop } from "./services/PerformanceLoop";
import { VTubeStudioClient } from "./services/vtubeStudio";
import { createInitialState, patchState } from "./state";

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: env.wsPath });
const eventBus = new EventBus();

const vtubeStudioClient = new VTubeStudioClient({
  url: env.vtsUrl,
  pluginName: env.vtsPluginName,
  pluginDeveloper: env.vtsPluginDeveloper,
  authToken: env.vtsAuthToken
});

const avatarAdapter = new VTubeStudioAdapter({
  client: vtubeStudioClient,
  hotkeys: env.hotkeys
});

const expressionEngine = new ExpressionEngine(avatarAdapter);
const speechProvider = new OpenAISpeechProvider({
  apiKey: env.openaiApiKey,
  model: env.openaiTtsModel,
  voice: env.openaiTtsVoice
});
const audioPlaybackService = new AudioPlaybackService();

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

const performanceLoop = new PerformanceLoop({
  expressionEngine,
  speechProvider,
  audioPlaybackService,
  publish
});

eventBus.on("subtitle.set", async ({ text, characterName }) => {
  currentState = patchState(currentState, {
    subtitle: text,
    ...(characterName ? { characterName } : {})
  });
});

eventBus.on("speaking.set", async ({ speaking }) => {
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

eventBus.on("state.set", ({ state }) => {
  currentState = patchState(currentState, { state });
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
    try {
      const result = parseEvent(type, req.body);
      publish(type, result);
      return res.json({ ok: true, state: currentState });
    } catch (error) {
      return res.status(400).json({ ok: false, error: (error as Error).message });
    }
  });
}

bindValidatedRoute("/api/subtitle", "subtitle.set");
bindValidatedRoute("/api/speaking", "speaking.set");
bindValidatedRoute("/api/status", "status.set");

app.post("/api/speak", async (req, res) => {
  const parsed = speechRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  if (!env.openaiApiKey) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not configured" });
  }

  try {
    await performanceLoop.performSpeech(parsed.data);
    return res.json({ ok: true, state: currentState });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

app.post("/api/test/speak", async (_req, res) => {
  if (!env.openaiApiKey) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not configured" });
  }

  try {
    await performanceLoop.performSpeech({
      text: "System online. Voice test successful.",
      emotion: "happy"
    });

    return res.json({ ok: true, state: currentState });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

app.get("/api/speech/status", (_req, res) => {
  const speechStatus = performanceLoop.getSpeechStatus(currentState.state);
  return res.json({ ok: true, speech: speechStatus, state: currentState });
});

app.post("/api/avatar/emotion", async (req, res) => {
  const parsed = emotionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const normalized = expressionEngine.normalizeEmotionInput(parsed.data.emotion);
  const state = expressionEngine.buildExpressionState(normalized);
  const applied = await expressionEngine.applyExpressionState(state);
  publish("emotion.set", { emotion: normalized });

  return res.json({ ok: true, emotion: normalized, expressionState: applied });
});

app.post("/api/avatar/expression", async (req, res) => {
  const parsed = expressionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const applied = await expressionEngine.applyExpressionState(parsed.data);
    return res.json({ ok: true, expressionState: applied });
  } catch (error) {
    return res.status(400).json({ ok: false, error: (error as Error).message });
  }
});

app.post("/api/avatar/test-cycle", async (_req, res) => {
  const cycle = [
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

  void (async () => {
    for (const [index, emotion] of cycle.entries()) {
      const state = expressionEngine.buildExpressionState(emotion);
      await expressionEngine.applyExpressionState(state);
      console.info("[avatar.test-cycle] applied", { emotion, index });
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }
  })();

  return res.json({ ok: true, message: "Avatar expression cycle started", cycle });
});

app.get("/api/avatar/status", (_req, res) => {
  const adapterStatus = avatarAdapter.getStatus();
  return res.json({
    ok: true,
    adapter: adapterStatus,
    desiredExpressionState: expressionEngine.getCurrentState(),
    actualActiveToggleState: adapterStatus.actualActiveToggleState,
    lastTransitionPlan: adapterStatus.lastTransitionPlan
  });
});

app.post("/api/test-sequence", async (_req, res) => {
  const steps: Array<{ delay: number; type: EventName; payload: unknown }> = [
    { delay: 0, type: "status.set", payload: { status: "Running demo sequence" } },
    { delay: 300, type: "subtitle.set", payload: { text: "Hello chat, I am online.", characterName: "Nova" } },
    { delay: 700, type: "speaking.set", payload: { speaking: true } },
    { delay: 1300, type: "subtitle.set", payload: { text: "Expression test in progress..." } },
    { delay: 2200, type: "speaking.set", payload: { speaking: false } },
    { delay: 3000, type: "status.set", payload: { status: "Demo sequence complete" } }
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

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid payload", details: error.flatten() });
  }

  console.error("[controller] unhandled error", error);
  return res.status(500).json({ error: "Internal server error" });
});

server.listen(env.port, async () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);
  await avatarAdapter.connect();
});
