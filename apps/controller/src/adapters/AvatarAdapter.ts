import type { Emotion } from '@vtuber/shared';

export interface AvatarAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setSpeaking(isSpeaking: boolean): Promise<void>;
  setEmotion(emotion: Emotion): Promise<void>;
  triggerExpression(expression: string): Promise<void>;
}
