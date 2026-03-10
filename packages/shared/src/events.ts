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

export const stateSetSchema = z.object({
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

export const speechLifecycleSchema = z.object({
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
  "state.sync": overlayStateSchema
} as const;

export type EventName = keyof typeof eventSchemas;

export type SubtitleSetPayload = z.infer<typeof subtitleSetSchema>;
export type SpeakingSetPayload = z.infer<typeof speakingSetSchema>;
export type EmotionSetPayload = z.infer<typeof emotionSetSchema>;
export type StatusSetPayload = z.infer<typeof statusSetSchema>;
export type SceneSetPayload = z.infer<typeof sceneSetSchema>;
export type StateSetPayload = z.infer<typeof stateSetSchema>;
export type OverlayState = z.infer<typeof overlayStateSchema>;
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
  "state.sync": OverlayState;
};

export type OverlayEvent = {
  [T in EventName]: {
    type: T;
    payload: EventPayloadMap[T];
    timestamp: number;
  };
}[EventName];

export const overlayStateEventNames = [
  "subtitle.set",
  "speaking.set",
  "emotion.set",
  "status.set",
  "scene.set",
  "state.set",
  "state.sync"
] as const;

export type OverlayStateEventName = (typeof overlayStateEventNames)[number];

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

export function reduceOverlayState(previous: OverlayState, event: OverlayEvent): OverlayState {
  switch (event.type) {
    case "state.sync":
      return event.payload;
    case "subtitle.set":
      return {
        ...previous,
        subtitle: event.payload.text,
        characterName: event.payload.characterName ?? previous.characterName
      };
    case "speaking.set":
      return {
        ...previous,
        speaking: event.payload.speaking
      };
    case "emotion.set":
      return {
        ...previous,
        emotion: event.payload.emotion
      };
    case "status.set":
      return {
        ...previous,
        status: event.payload.status
      };
    case "scene.set":
      return {
        ...previous,
        scene: event.payload.scene
      };
    case "state.set":
      return {
        ...previous,
        state: event.payload.state
      };
    case "speech.started":
    case "speech.finished":
      return previous;
    default:
      return previous;
  }
}
