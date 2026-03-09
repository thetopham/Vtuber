import { z } from "zod";
import { DEFAULT_STATE, EMOTIONS } from "./constants";

export const subtitleSetSchema = z.object({
  text: z.string().min(1).max(300),
  characterName: z.string().min(1).max(48).optional()
});

export const speakingSetSchema = z.object({
  speaking: z.boolean()
});

export const emotionSetSchema = z.object({
  emotion: z.enum(EMOTIONS)
});

export const statusSetSchema = z.object({
  status: z.string().min(1).max(120)
});

export const sceneSetSchema = z.object({
  scene: z.string().min(1).max(120)
});

export const controllerStateSetSchema = z.object({
  state: z.enum(["idle", "listening", "speaking"])
});

export const speechStartedSchema = z.object({
  text: z.string().min(1).max(600),
  emotion: z.enum(EMOTIONS)
});

export const speechFinishedSchema = z.object({
  text: z.string().min(1).max(600),
  emotion: z.enum(EMOTIONS)
});

export const speechRequestSchema = z.object({
  text: z.string().trim().min(1).max(600),
  emotion: z.enum(EMOTIONS).default("neutral")
});

export const speechStatusSchema = z.object({
  isPlaying: z.boolean(),
  lastSpokenText: z.string().nullable(),
  lastRequestedEmotion: z.enum(EMOTIONS).nullable(),
  currentControllerState: z.enum(["idle", "listening", "speaking"]),
  lastAudioFilePath: z.string().nullable()
});

export const overlayStateSchema = z.object({
  characterName: z.string().min(1).max(48),
  subtitle: z.string().min(1).max(300),
  speaking: z.boolean(),
  emotion: z.enum(EMOTIONS),
  state: z.enum(["idle", "listening", "speaking"]),
  status: z.string().min(1).max(120),
  scene: z.string().min(1).max(120)
});

export const eventSchemas = {
  "subtitle.set": subtitleSetSchema,
  "speaking.set": speakingSetSchema,
  "emotion.set": emotionSetSchema,
  "status.set": statusSetSchema,
  "scene.set": sceneSetSchema,
  "state.set": controllerStateSetSchema,
  "speech.started": speechStartedSchema,
  "speech.finished": speechFinishedSchema,
  "state.sync": overlayStateSchema
} as const;

export type EventName = keyof typeof eventSchemas;

export type SubtitleSetPayload = z.infer<typeof subtitleSetSchema>;
export type SpeakingSetPayload = z.infer<typeof speakingSetSchema>;
export type EmotionSetPayload = z.infer<typeof emotionSetSchema>;
export type StatusSetPayload = z.infer<typeof statusSetSchema>;
export type SceneSetPayload = z.infer<typeof sceneSetSchema>;
export type ControllerStateSetPayload = z.infer<typeof controllerStateSetSchema>;
export type SpeechStartedPayload = z.infer<typeof speechStartedSchema>;
export type SpeechFinishedPayload = z.infer<typeof speechFinishedSchema>;
export type SpeechRequest = z.infer<typeof speechRequestSchema>;
export type SpeechStatus = z.infer<typeof speechStatusSchema>;
export type OverlayState = z.infer<typeof overlayStateSchema>;

export type EventPayloadMap = {
  "subtitle.set": SubtitleSetPayload;
  "speaking.set": SpeakingSetPayload;
  "emotion.set": EmotionSetPayload;
  "status.set": StatusSetPayload;
  "scene.set": SceneSetPayload;
  "state.set": ControllerStateSetPayload;
  "speech.started": SpeechStartedPayload;
  "speech.finished": SpeechFinishedPayload;
  "state.sync": OverlayState;
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
