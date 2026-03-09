import { z } from "zod";
import { DEFAULT_STATE, EMOTIONS } from "./constants";

const performerIdSchema = z.string().trim().min(1).max(48);

export const subtitleSetSchema = z.object({
  performerId: performerIdSchema.optional(),
  text: z.string().min(1).max(300),
  characterName: z.string().min(1).max(48).optional()
});

export const speakingSetSchema = z.object({
  performerId: performerIdSchema.optional(),
  speaking: z.boolean()
});

export const emotionSetSchema = z.object({
  performerId: performerIdSchema.optional(),
  emotion: z.enum(EMOTIONS)
});

export const statusSetSchema = z.object({
  performerId: performerIdSchema.optional(),
  status: z.string().min(1).max(120)
});

export const sceneSetSchema = z.object({
  performerId: performerIdSchema.optional(),
  scene: z.string().min(1).max(120)
});

export const stateSetSchema = z.object({
  performerId: performerIdSchema.optional(),
  state: z.enum(["idle", "listening", "speaking"])
});

export const overlayStateSchema = z.object({
  characterName: z.string().min(1).max(48),
  subtitle: z.string().min(1).max(300),
  speaking: z.boolean(),
  emotion: z.enum(EMOTIONS),
  status: z.string().min(1).max(120),
  scene: z.string().min(1).max(120),
  state: z.enum(["idle", "listening", "speaking"])
});

export const performerOverlayStateSchema = z.object({
  performerId: performerIdSchema,
  characterName: z.string().min(1).max(48),
  subtitle: z.string().min(1).max(300),
  speaking: z.boolean(),
  emotion: z.enum(EMOTIONS),
  status: z.string().min(1).max(120),
  scene: z.string().min(1).max(120),
  state: z.enum(["idle", "listening", "speaking"])
});

export const multiOverlayStateSchema = z.object({
  stage: z.object({
    mode: z.enum(["idle", "banter", "responding"]),
    activeSpeakerId: performerIdSchema.nullable(),
    banterEnabled: z.boolean(),
    banterStatus: z.enum(["idle", "running", "interrupted"]),
    lastSpeakerId: performerIdSchema.nullable()
  }),
  performers: z.record(performerIdSchema, performerOverlayStateSchema),
  legacy: overlayStateSchema
});

export const speechLifecycleSchema = z.object({
  performerId: performerIdSchema.optional(),
  text: z.string().min(1).max(400),
  emotion: z.enum(EMOTIONS)
});

export const eventSchemas = {
  "subtitle.set": subtitleSetSchema,
  "speaking.set": speakingSetSchema,
  "emotion.set": emotionSetSchema,
  "status.set": statusSetSchema,
  "scene.set": sceneSetSchema,
  "state.set": stateSetSchema,
  "speech.started": speechLifecycleSchema,
  "speech.finished": speechLifecycleSchema,
  "state.sync": z.union([overlayStateSchema, multiOverlayStateSchema])
} as const;

export type EventName = keyof typeof eventSchemas;

export type SubtitleSetPayload = z.infer<typeof subtitleSetSchema>;
export type SpeakingSetPayload = z.infer<typeof speakingSetSchema>;
export type EmotionSetPayload = z.infer<typeof emotionSetSchema>;
export type StatusSetPayload = z.infer<typeof statusSetSchema>;
export type SceneSetPayload = z.infer<typeof sceneSetSchema>;
export type StateSetPayload = z.infer<typeof stateSetSchema>;
export type OverlayState = z.infer<typeof overlayStateSchema>;
export type PerformerOverlayState = z.infer<typeof performerOverlayStateSchema>;
export type MultiOverlayState = z.infer<typeof multiOverlayStateSchema>;
export type SpeechLifecyclePayload = z.infer<typeof speechLifecycleSchema>;

export type EventPayloadMap = {
  "subtitle.set": SubtitleSetPayload;
  "speaking.set": SpeakingSetPayload;
  "emotion.set": EmotionSetPayload;
  "status.set": StatusSetPayload;
  "scene.set": SceneSetPayload;
  "state.set": StateSetPayload;
  "speech.started": SpeechLifecyclePayload;
  "speech.finished": SpeechLifecyclePayload;
  "state.sync": OverlayState | MultiOverlayState;
};

export type OverlayEvent = {
  [T in EventName]: {
    type: T;
    payload: EventPayloadMap[T];
    timestamp: number;
  };
}[EventName];

export const defaultOverlayState: OverlayState = {
  ...DEFAULT_STATE
};

export function makeEvent<T extends EventName>(
  type: T,
  payload: EventPayloadMap[T]
): OverlayEvent {
  return {
    type,
    payload,
    timestamp: Date.now()
  } as OverlayEvent;
}

export function parseEvent<T extends EventName>(
  type: T,
  payload: unknown
): EventPayloadMap[T] {
  return eventSchemas[type].parse(payload) as EventPayloadMap[T];
}
