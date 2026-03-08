import type { Emotion } from '@vtuber/shared';
import type { AvatarAdapter } from '../adapters/AvatarAdapter.js';

/**
 * Placeholder adapter for VTube Studio integration.
 * TODO(next): connect to VTube Studio WebSocket API.
 * TODO(next): authenticate and trigger VTube Studio hotkeys / expressions.
 * TODO(next): sync speaking/emotion with avatar parameters in real time.
 */
export class VTubeStudioService implements AvatarAdapter {
  async connect(): Promise<void> {
    console.log('[vtube-studio] connect() stub called');
  }

  async disconnect(): Promise<void> {
    console.log('[vtube-studio] disconnect() stub called');
  }

  async setSpeaking(speaking: boolean): Promise<void> {
    console.log('[vtube-studio] setSpeaking() stub called', { speaking });
  }

  async setEmotion(emotion: Emotion): Promise<void> {
    console.log('[vtube-studio] setEmotion() stub called', { emotion });
  }

  async triggerExpression(name: string): Promise<void> {
    console.log('[vtube-studio] triggerExpression() stub called', { name });
  }
}
