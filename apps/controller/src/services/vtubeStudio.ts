import type { Emotion } from '@vtuber/shared';
import type { AvatarAdapter } from '../adapters/AvatarAdapter.js';

export class VTubeStudioService implements AvatarAdapter {
  async connect(): Promise<void> {
    // TODO: Connect to VTube Studio WebSocket API and authenticate plugin token.
    console.log('[vtube-studio] connect() stub called');
  }

  async disconnect(): Promise<void> {
    // TODO: Close VTube Studio WebSocket connection and cleanup listeners.
    console.log('[vtube-studio] disconnect() stub called');
  }

  async setSpeaking(isSpeaking: boolean): Promise<void> {
    // TODO: Map speaking state to VTube Studio parameter/hotkey automation.
    console.log(`[vtube-studio] setSpeaking(${isSpeaking}) stub called`);
  }

  async setEmotion(emotion: Emotion): Promise<void> {
    // TODO: Trigger VTube Studio hotkeys or expressions based on emotion map.
    console.log(`[vtube-studio] setEmotion(${emotion}) stub called`);
  }

  async triggerExpression(expression: string): Promise<void> {
    // TODO: Trigger expression/hotkey via VTube Studio request schema.
    console.log(`[vtube-studio] triggerExpression(${expression}) stub called`);
  }
}
