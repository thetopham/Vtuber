export const EMOTIONS = [
  "neutral",
  "happy",
  "angry",
  "sad",
  "surprised",
  "thinking"
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export interface OverlayState {
  subtitle: string;
  speaking: boolean;
  emotion: Emotion;
  status: string;
  scene: string;
  characterName: string;
}

export const DEFAULT_STATE: OverlayState = {
  subtitle: "Ready.",
  speaking: false,
  emotion: "neutral",
  status: "Idle",
  scene: "default",
  characterName: "Astra"
};
