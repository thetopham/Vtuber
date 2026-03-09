import { internalEmotions, type InternalEmotion } from "./avatar";

export const EMOTIONS = internalEmotions;

export type Emotion = InternalEmotion;

export const DEFAULT_STATE = {
  characterName: "Nova",
  subtitle: "System ready. Waiting for command...",
  speaking: false,
  emotion: "neutral" as Emotion,
  status: "idle",
  scene: "default",
  state: "idle" as const
};
