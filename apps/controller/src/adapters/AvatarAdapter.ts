import type { Emotion, OverlayState } from "@vtuber/shared";

export interface AvatarAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setEmotion(emotion: Emotion): Promise<void>;
  setSpeaking(speaking: boolean): Promise<void>;
  syncState(state: OverlayState): Promise<void>;
}
