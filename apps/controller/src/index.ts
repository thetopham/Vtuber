import cors from "cors";
import express from "express";
import http from "node:http";
import {
  emotionInputSchema,
  expressionInputSchema,
  makeEvent,
  overlayStateEventNames,
  parseEvent,
  reduceOverlayState,
  respondRequestSchema,
  speechRequestSchema,
  speechStatusSchema,
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
import { ResponseOrchestrator } from "./orchestration/ResponseOrchestrator";
import { defaultPersonaConfig } from "./orchestration/prompt";
import { AudioPlaybackService } from "./services/AudioPlaybackService";
import { ExpressionEngine } from "./services/ExpressionEngine";
import { OpenAIResponsesService } from "./services/OpenAIResponsesService";
import { OpenAISpeechProvider } from "./services/OpenAISpeechProvider";
import { PerformanceLoop } from "./services/PerformanceLoop";
import { VTubeStudioClient } from "./services/vtubeStudio";
import { createInitialState } from "./state";

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
const speechProvider = new OpenAISpeechProvider();
const audioPlaybackService = new AudioPlaybackService();

let currentState: OverlayState = createInitialState();

const performanceLoop = new PerformanceLoop({
  expressionEngine,
  speechProvider,
  audioPlaybackService,
  publish,
  getControllerStatus: () => currentState.state
});

const openAIResponsesService = new OpenAIResponsesService();
const responseOrchestrator = new ResponseOrchestrator({
  service: openAIResponsesService,
  hasOpenAIApiKey: Boolean(env.openaiApiKey),
  model: env.openaiModel
});

const personaConfigSchema = z.object({
  name: z.string().trim().min(1).max(48),
  role: z.string().trim().min(1).max(160),
  personality: z.string().trim().min(1).max(300),
  tone: z.string().trim().min(1).max(120),
  styleRules: z.string().trim().min(1).max(360),
  background: z.string().trim().min(1).max(600),
  boundaries: z.string().trim().min(1).max(360),
  extraInstructions: z.string().trim().max(600).default("")
});

const personaPresetNameSchema = z.string().trim().min(1).max(48);
const personaPresetSaveSchema = z.object({
  presetName: personaPresetNameSchema,
  persona: personaConfigSchema
});
const personaPresetLoadSchema = z.object({
  presetName: personaPresetNameSchema
});

const personaPresets = new Map<string, z.infer<typeof personaConfigSchema>>();
personaPresets.set("Default", { ...defaultPersonaConfig });

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

function bindStateUpdater<T extends (typeof overlayStateEventNames)[number]>(type: T): void {
  if (type === "state.sync") {
    return;
  }

  eventBus.on(type, (payload) => {
    currentState = reduceOverlayState(currentState, makeEvent(type, payload));
  });
}

overlayStateEventNames.forEach((type) => {
  bindStateUpdater(type);
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

function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => Promise<unknown>
): express.RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

bindValidatedRoute("/api/subtitle", "subtitle.set");
bindValidatedRoute("/api/speaking", "speaking.set");
bindValidatedRoute("/api/status", "status.set");
bindValidatedRoute("/api/scene", "scene.set");
bindValidatedRoute("/api/state", "state.set");

app.post(
  "/api/avatar/emotion",
  asyncHandler(async (req, res) => {
    const parsed = emotionInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const normalized = expressionEngine.normalizeEmotionInput(parsed.data.emotion);
    const state = expressionEngine.buildExpressionState(normalized);
    const applied = await expressionEngine.applyExpressionState(state);
    publish("emotion.set", { emotion: normalized });

    return res.json({ ok: true, emotion: normalized, expressionState: applied });
  })
);

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

app.post("/api/speak", async (req, res) => {
  const parsed = speechRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    await performanceLoop.performLine(parsed.data);
    return res.json({ ok: true, speech: performanceLoop.getStatus() });
  } catch (error) {
    const message = (error as Error).message;
    const statusCode = message.includes("already in progress") ? 409 : 500;
    return res.status(statusCode).json({ ok: false, error: message });
  }
});

app.post("/api/test/speak", async (_req, res) => {
  const testLine = {
    text: "System online. Voice test successful.",
    emotion: "happy" as const
  };

  try {
    await performanceLoop.performLine(testLine);
    return res.json({ ok: true, speech: performanceLoop.getStatus(), testLine });
  } catch (error) {
    const message = (error as Error).message;
    const statusCode = message.includes("already in progress") ? 409 : 500;
    return res.status(statusCode).json({ ok: false, error: message });
  }
});

app.get("/api/speech/status", (_req, res) => {
  const status = performanceLoop.getStatus();
  const validatedStatus = speechStatusSchema.parse(status);
  return res.json({ ok: true, speech: validatedStatus, state: currentState });
});

app.post("/api/respond-only", async (req, res) => {
  const parsed = respondRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const intent = await responseOrchestrator.generateIntent(parsed.data);
    return res.json({ ok: true, intent });
  } catch (error) {
    responseOrchestrator.setLastValidationError((error as Error).message);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

app.post("/api/respond", async (req, res) => {
  const parsed = respondRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const intent = await responseOrchestrator.generateIntent(parsed.data);
    let triggeredSpeaking = false;

    const aiSubtitle = intent.spokenText.trim();
    if (aiSubtitle.length > 0) {
      publish("subtitle.set", { text: aiSubtitle });
    }

    if (intent.shouldSpeak) {
      await performanceLoop.performLine({
        text: intent.spokenText,
        emotion: intent.emotion,
        expressionState: intent.expressionState,
        persona: responseOrchestrator.getPersonaConfig()
      });
      triggeredSpeaking = true;
    }

    responseOrchestrator.markRespondOutcome(triggeredSpeaking);

    return res.json({
      ok: true,
      intent,
      triggeredSpeaking,
      speech: performanceLoop.getStatus()
    });
  } catch (error) {
    responseOrchestrator.setLastValidationError((error as Error).message);
    responseOrchestrator.markRespondOutcome(false);
    const message = (error as Error).message;
    const statusCode = message.includes("already in progress") ? 409 : 500;
    return res.status(statusCode).json({ ok: false, error: message });
  }
});

app.get("/api/ai/status", (_req, res) => {
  return res.json({ ok: true, ai: responseOrchestrator.getStatus() });
});

app.get("/api/persona", (_req, res) => {
  return res.json({ ok: true, persona: responseOrchestrator.getPersonaConfig() });
});

app.post("/api/persona", (req, res) => {
  const parsed = personaConfigSchema.safeParse({ ...defaultPersonaConfig, ...req.body });
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  responseOrchestrator.setPersonaConfig(parsed.data);
  return res.json({ ok: true, persona: responseOrchestrator.getPersonaConfig() });
});

app.get("/api/personas", (_req, res) => {
  return res.json({
    ok: true,
    presets: Array.from(personaPresets.keys()).sort((a, b) => a.localeCompare(b)),
    activePersona: responseOrchestrator.getPersonaConfig()
  });
});

app.post("/api/personas", (req, res) => {
  const parsed = personaPresetSaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { presetName, persona } = parsed.data;
  personaPresets.set(presetName, { ...persona });

  return res.json({
    ok: true,
    presetName,
    presets: Array.from(personaPresets.keys()).sort((a, b) => a.localeCompare(b))
  });
});

app.post("/api/personas/load", (req, res) => {
  const parsed = personaPresetLoadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const preset = personaPresets.get(parsed.data.presetName);
  if (!preset) {
    return res.status(404).json({ ok: false, error: `Persona preset not found: ${parsed.data.presetName}` });
  }

  responseOrchestrator.setPersonaConfig(preset);
  return res.json({ ok: true, presetName: parsed.data.presetName, persona: responseOrchestrator.getPersonaConfig() });
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

server.listen(env.port, () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);

  void avatarAdapter.connect().catch((error) => {
    console.error("[controller] failed to connect avatar adapter", error);
  });
});
