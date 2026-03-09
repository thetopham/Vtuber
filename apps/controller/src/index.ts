import cors from "cors";
import express from "express";
import http from "node:http";
import {
  emotionInputSchema,
  expressionInputSchema,
  makeEvent,
  parseEvent,
  respondRequestSchema,
  speechRequestSchema,
  speechStatusSchema,
  type EventName,
  type EventPayloadMap,
  type MultiOverlayState,
  type OverlayEvent,
  type OverlayState
} from "@vtuber/shared";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { EventBus } from "./eventBus";
import { env } from "./env";
import { OpenAISpeechProvider } from "./services/OpenAISpeechProvider";
import { AudioPlaybackService } from "./services/AudioPlaybackService";
import { OpenAIResponsesService } from "./services/OpenAIResponsesService";
import { defaultPersonaConfig } from "./orchestration/prompt";
import { createInitialMultiState } from "./state/multiState";
import { getPerformerConfigs } from "./config/performers";
import { createPerformer } from "./performers/createPerformer";
import { ConversationDirector } from "./director/ConversationDirector";
import { directorTextInputSchema } from "./director/types";

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: env.wsPath });
const eventBus = new EventBus();

const performerConfigs = getPerformerConfigs();
const audioPlaybackService = new AudioPlaybackService();
const speechProvider = new OpenAISpeechProvider();
const responsesService = new OpenAIResponsesService();

let currentState: MultiOverlayState = createInitialMultiState(performerConfigs);

function getPrimaryPerformerId(): string {
  return performerConfigs[0]?.id ?? "nova";
}

function syncLegacyState(): void {
  const activeId = currentState.stage.activeSpeakerId ?? currentState.stage.lastSpeakerId ?? getPrimaryPerformerId();
  const source = currentState.performers[activeId] ?? currentState.performers[getPrimaryPerformerId()];
  if (!source) {
    return;
  }

  currentState.legacy = {
    characterName: source.characterName,
    subtitle: source.subtitle,
    speaking: source.speaking,
    emotion: source.emotion,
    status: source.status,
    scene: source.scene,
    state: source.state
  };
}

function updateStage(updater: (stage: MultiOverlayState["stage"]) => MultiOverlayState["stage"]): void {
  currentState = { ...currentState, stage: updater(currentState.stage) };
  syncLegacyState();
}

function patchPerformerState(performerId: string, updates: Partial<MultiOverlayState["performers"][string]>): void {
  const prev = currentState.performers[performerId];
  if (!prev) {
    return;
  }

  currentState = {
    ...currentState,
    performers: {
      ...currentState.performers,
      [performerId]: {
        ...prev,
        ...updates,
        performerId
      }
    }
  };

  syncLegacyState();
}

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

const performers = performerConfigs.map((config) =>
  createPerformer({
    config,
    publish,
    getControllerStatus: () => currentState.performers[config.id]?.state ?? "idle",
    sharedAudioPlaybackService: audioPlaybackService,
    sharedSpeechProvider: speechProvider,
    responsesService
  })
);

const performerMap = new Map(performers.map((performer) => [performer.id, performer]));

const director = new ConversationDirector(performers, {
  updateStage,
  getState: () => currentState
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

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());


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
bindValidatedRoute("/api/state", "state.set");

function resolvePerformerId(payload: { performerId?: string }): string {
  return payload.performerId ?? getPrimaryPerformerId();
}

eventBus.on("subtitle.set", ({ performerId, text, characterName }) => {
  patchPerformerState(resolvePerformerId({ performerId }), {
    subtitle: text,
    ...(characterName ? { characterName } : {})
  });
});

eventBus.on("speaking.set", ({ performerId, speaking }) => {
  patchPerformerState(resolvePerformerId({ performerId }), { speaking });
});

eventBus.on("emotion.set", ({ performerId, emotion }) => {
  patchPerformerState(resolvePerformerId({ performerId }), { emotion });
});

eventBus.on("status.set", ({ performerId, status }) => {
  patchPerformerState(resolvePerformerId({ performerId }), { status });
});

eventBus.on("scene.set", ({ performerId, scene }) => {
  patchPerformerState(resolvePerformerId({ performerId }), { scene });
});

eventBus.on("state.set", ({ performerId, state }) => {
  patchPerformerState(resolvePerformerId({ performerId }), { state });
});

wsServer.on("connection", (socket) => {
  socket.send(JSON.stringify(makeEvent("state.sync", currentState)));
});

function getPerformerOrThrow(id: string) {
  const performer = performerMap.get(id);
  if (!performer) {
    throw new Error(`Unknown performer: ${id}`);
  }

  return performer;
}

app.get("/api/performers", (_req, res) => {
  return res.json({ ok: true, performers: performers.map((performer) => ({ id: performer.id, displayName: performer.displayName })) });
});

app.get("/api/performers/:id/status", (req, res) => {
  try {
    return res.json({ ok: true, performer: getPerformerOrThrow(req.params.id).getStatus() });
  } catch (error) {
    return res.status(404).json({ ok: false, error: (error as Error).message });
  }
});

app.get("/api/performers/:id/persona", (req, res) => {
  try {
    const performer = getPerformerOrThrow(req.params.id);
    return res.json({ ok: true, persona: performer.responseOrchestrator.getPersonaConfig() });
  } catch (error) {
    return res.status(404).json({ ok: false, error: (error as Error).message });
  }
});

app.post("/api/performers/:id/persona", (req, res) => {
  try {
    const performer = getPerformerOrThrow(req.params.id);
    const parsed = personaConfigSchema.safeParse({ ...defaultPersonaConfig, ...req.body });
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    performer.responseOrchestrator.setPersonaConfig(parsed.data);
    return res.json({ ok: true, persona: performer.responseOrchestrator.getPersonaConfig() });
  } catch (error) {
    return res.status(404).json({ ok: false, error: (error as Error).message });
  }
});

async function handleRespondRoute(performerId: string, body: unknown, execute: boolean, res: express.Response): Promise<void> {
  const parsed = respondRequestSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const performer = getPerformerOrThrow(performerId);
    const intent = await performer.responseOrchestrator.generateIntent(parsed.data, { replyTarget: "event" });

    if (!execute || !intent.shouldSpeak) {
      res.json({ ok: true, intent, triggeredSpeaking: false });
      return;
    }

    await director.respondAsPerformer(performerId, parsed.data, "event");
    res.json({ ok: true, intent, triggeredSpeaking: true, speech: performer.performanceLoop.getStatus() });
  } catch (error) {
    const message = (error as Error).message;
    const statusCode = message.includes("already in progress") ? 409 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
}

app.post("/api/performers/:id/respond-only", async (req, res) => {
  await handleRespondRoute(req.params.id, req.body, false, res);
});

app.post("/api/performers/:id/respond", async (req, res) => {
  await handleRespondRoute(req.params.id, req.body, true, res);
});

app.get("/api/director/status", (_req, res) => {
  res.json({ ok: true, director: director.getStatus(), state: currentState });
});

app.post("/api/director/banter/start", async (req, res) => {
  await director.startAutonomousBanter(req.body?.seed);
  res.json({ ok: true, director: director.getStatus() });
});

app.post("/api/director/banter/stop", async (req, res) => {
  await director.stopAutonomousBanter(req.body?.reason);
  res.json({ ok: true, director: director.getStatus() });
});

app.post("/api/director/chat", async (req, res) => {
  const parsed = directorTextInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const result = await director.interruptWithChat({
    inputType: "event",
    event: { type: "chat.message", summary: `${parsed.data.username ? `${parsed.data.username}: ` : ""}${parsed.data.text}` }
  });

  return res.json({ ok: true, ...result });
});

app.post("/api/director/operator", async (req, res) => {
  const parsed = directorTextInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const result = await director.interruptWithOperator({ inputType: "manual", text: parsed.data.text });
  return res.json({ ok: true, ...result });
});

// backward-compatible routes map to default performer (nova)
app.post("/api/respond-only", async (req, res) => {
  await handleRespondRoute(getPrimaryPerformerId(), req.body, false, res);
});

app.post("/api/respond", async (req, res) => {
  await handleRespondRoute(getPrimaryPerformerId(), req.body, true, res);
});

app.get("/api/ai/status", (_req, res) => {
  const performer = getPerformerOrThrow(getPrimaryPerformerId());
  return res.json({ ok: true, ai: performer.responseOrchestrator.getStatus() });
});

app.get("/api/persona", (_req, res) => {
  const performer = getPerformerOrThrow(getPrimaryPerformerId());
  return res.json({ ok: true, persona: performer.responseOrchestrator.getPersonaConfig() });
});

app.post("/api/persona", (req, res) => {
  const performer = getPerformerOrThrow(getPrimaryPerformerId());
  const parsed = personaConfigSchema.safeParse({ ...defaultPersonaConfig, ...req.body });
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  performer.responseOrchestrator.setPersonaConfig(parsed.data);
  return res.json({ ok: true, persona: performer.responseOrchestrator.getPersonaConfig() });
});

app.post("/api/speak", async (req, res) => {
  const parsed = speechRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const performerId = req.body?.performerId ?? getPrimaryPerformerId();
    const performer = getPerformerOrThrow(performerId);
    await performer.performanceLoop.performLine(parsed.data);
    return res.json({ ok: true, speech: performer.performanceLoop.getStatus() });
  } catch (error) {
    const message = (error as Error).message;
    const statusCode = message.includes("already in progress") ? 409 : 500;
    return res.status(statusCode).json({ ok: false, error: message });
  }
});

app.get("/api/speech/status", (_req, res) => {
  const performer = getPerformerOrThrow(getPrimaryPerformerId());
  const status = performer.performanceLoop.getStatus();
  const validatedStatus = speechStatusSchema.parse(status);
  return res.json({ ok: true, speech: validatedStatus, state: currentState });
});

app.post("/api/avatar/emotion", async (req, res) => {
  const parsed = emotionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const performer = getPerformerOrThrow(req.body?.performerId ?? getPrimaryPerformerId());
  const normalized = performer.expressionEngine.normalizeEmotionInput(parsed.data.emotion);
  const state = performer.expressionEngine.buildExpressionState(normalized);
  const applied = await performer.expressionEngine.applyExpressionState(state);
  publish("emotion.set", { performerId: performer.id, emotion: normalized });

  return res.json({ ok: true, emotion: normalized, expressionState: applied });
});

app.post("/api/avatar/expression", async (req, res) => {
  const parsed = expressionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const performer = getPerformerOrThrow(req.body?.performerId ?? getPrimaryPerformerId());
    const applied = await performer.expressionEngine.applyExpressionState(parsed.data);
    return res.json({ ok: true, expressionState: applied });
  } catch (error) {
    return res.status(400).json({ ok: false, error: (error as Error).message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, state: currentState });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid payload", details: error.flatten() });
  }

  return res.status(500).json({ error: "Internal server error" });
});

server.listen(env.port, async () => {
  console.info(`Controller listening on http://localhost:${env.port}`);
  console.info(`WebSocket endpoint ws://localhost:${env.port}${env.wsPath}`);
  for (const performer of performers) {
    await performer.avatarAdapter.connect();
  }
});
