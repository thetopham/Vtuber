import type { InternalEmotion } from "./avatar";

export const EMOTIONS = [
  "neutral",
  "happy",
  "angry",
  "pouting",
  "embarrassed",
  "excited",
  "sad",
  "shocked",
  "wink"
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const DEFAULT_STATE = {
  characterName: "Nova",
  subtitle: "System ready. Waiting for command...",
  speaking: false,
  emotion: "neutral" as InternalEmotion,
  status: "idle",
  scene: "default"
};
