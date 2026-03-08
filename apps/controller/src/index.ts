import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import {
  DEFAULT_STATE,
  emotionPayloadSchema,
  outboundSocketEventSchema,
  speakingPayloadSchema,
  statusPayloadSchema,
  subtitlePayloadSchema,
  type ControllerEvent,
  type OverlayState
} from "@vtuber/shared";
import { EventBus } from "./eventBus.js";
import { VTubeStudioService } from "./services/vtubeStudio.js";

const PORT = Number(process.env.PORT ?? 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json());

const eventBus = new EventBus();
const avatarAdapter = new VTubeStudioService();
const state: OverlayState = { ...DEFAULT_STATE };

const logEvent = (label: string, payload: unknown): void => {
  console.info(`[controller] ${label}`, payload);
};

const broadcast = (event: ControllerEvent | { event: "state.snapshot"; data: { state: OverlayState } }): void => {
  const parsed = outboundSocketEventSchema.parse(event);
  const raw = JSON.stringify(parsed);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(raw);
    }
  });
};

const applyAndPublish = (event: ControllerEvent): void => {
  switch (event.event) {
    case "subtitle.set":
      state.subtitle = event.data.subtitle;
      break;
    case "speaking.set":
      state.speaking = event.data.speaking;
      void avatarAdapter.setSpeaking(event.data.speaking);
      break;
    case "emotion.set":
      state.emotion = event.data.emotion;
      void avatarAdapter.setEmotion(event.data.emotion);
      break;
    case "status.set":
      state.status = event.data.status;
      break;
    case "scene.set":
      state.scene = event.data.scene;
      break;
  }

  logEvent(event.event, event.data);
  eventBus.publish(event);
  broadcast(event);
};

wss.on("connection", (socket) => {
  console.info("[ws] overlay connected");
  broadcast({ event: "state.snapshot", data: { state } });

  socket.on("close", () => {
    console.info("[ws] overlay disconnected");
  });
});

eventBus.subscribe((event) => {
  logEvent("event-bus", event);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, state });
});

app.post("/api/subtitle", (req, res) => {
  const data = subtitlePayloadSchema.parse(req.body);
  applyAndPublish({ event: "subtitle.set", data });
  res.json({ ok: true, state });
});

app.post("/api/speaking", (req, res) => {
  const data = speakingPayloadSchema.parse(req.body);
  applyAndPublish({ event: "speaking.set", data });
  res.json({ ok: true, state });
});

app.post("/api/emotion", (req, res) => {
  const data = emotionPayloadSchema.parse(req.body);
  applyAndPublish({ event: "emotion.set", data });
  res.json({ ok: true, state });
});

app.post("/api/status", (req, res) => {
  const data = statusPayloadSchema.parse(req.body);
  applyAndPublish({ event: "status.set", data });
  res.json({ ok: true, state });
});

app.post("/api/test-sequence", async (_req, res) => {
  const sequence: ControllerEvent[] = [
    { event: "status.set", data: { status: "Running demo sequence" } },
    { event: "scene.set", data: { scene: "intro" } },
    { event: "speaking.set", data: { speaking: true } },
    { event: "emotion.set", data: { emotion: "happy" } },
    { event: "subtitle.set", data: { subtitle: "Hey chat! Welcome to the stream." } },
    { event: "emotion.set", data: { emotion: "thinking" } },
    { event: "subtitle.set", data: { subtitle: "Let me think about our next move..." } },
    { event: "emotion.set", data: { emotion: "surprised" } },
    { event: "subtitle.set", data: { subtitle: "Wait, that was unexpected!" } },
    { event: "speaking.set", data: { speaking: false } },
    { event: "status.set", data: { status: "Demo complete" } }
  ];

  for (const event of sequence) {
    applyAndPublish(event);
    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  res.json({ ok: true, state, steps: sequence.length });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[controller] error", error);
  res.status(400).json({ ok: false, error: error.message });
});

server.listen(PORT, async () => {
  await avatarAdapter.connect();
  console.info(`Controller server listening at http://localhost:${PORT}`);
});
