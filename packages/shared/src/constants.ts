import { INTERNAL_EMOTIONS, type InternalEmotion } from "./avatar";

export const EMOTIONS = INTERNAL_EMOTIONS;

export type Emotion = InternalEmotion;

export const DEFAULT_STATE = {
  characterName: "Nova",
  subtitle: "System ready. Waiting for command...",
  speaking: false,
  emotion: "neutral" as Emotion,
  status: "idle",
  scene: "default"
};
