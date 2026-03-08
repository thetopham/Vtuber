export const EMOTIONS = [
  "neutral",
  "happy",
  "angry",
  "sad",
  "surprised",
  "thinking"
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const DEFAULT_STATE = {
  characterName: "Nova",
  subtitle: "System ready. Waiting for command...",
  speaking: false,
  emotion: "neutral" as Emotion,
  status: "idle",
  scene: "default"
};
