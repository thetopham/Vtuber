import type { Emotion } from "@vtuber/shared";
import type { AvatarAdapter } from "../adapters/AvatarAdapter.js";

export class VTubeStudioService implements AvatarAdapter {
  async connect(): Promise<void> {
    // TODO: Connect to VTube Studio WebSocket API and authenticate plugin session.
    console.info("[VTubeStudioService] connect() called (stub)");
  }

  async disconnect(): Promise<void> {
    // TODO: Close VTube Studio WebSocket session and cleanly release resources.
    console.info("[VTubeStudioService] disconnect() called (stub)");
  }

  async setEmotion(emotion: Emotion): Promise<void> {
    // TODO: Trigger VTube Studio hotkeys/expressions based on normalized emotion state.
    console.info(`[VTubeStudioService] setEmotion(${emotion}) called (stub)`);
  }

  async setSpeaking(speaking: boolean): Promise<void> {
    // TODO: Sync speaking state to mouth-open params and animation blend values.
    console.info(`[VTubeStudioService] setSpeaking(${speaking}) called (stub)`);
  }
}
