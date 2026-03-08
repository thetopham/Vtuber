import type { Emotion } from '@vtuber/shared';

export interface AvatarAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setSpeaking(speaking: boolean): Promise<void>;
  setEmotion(emotion: Emotion): Promise<void>;
  triggerExpression(name: string): Promise<void>;
}
