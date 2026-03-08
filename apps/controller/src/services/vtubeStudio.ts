import type { Emotion, OverlayState } from "@vtuber/shared";
import type { AvatarAdapter } from "../adapters/AvatarAdapter";

export class VTubeStudioService implements AvatarAdapter {
  async connect(): Promise<void> {
    // TODO: Connect to the VTube Studio WebSocket API.
    // TODO: Handle authentication flow and plugin token storage.
    console.info("[VTubeStudioService] connect() stub called");
  }

  async disconnect(): Promise<void> {
    // TODO: Gracefully close WebSocket and clean up subscriptions.
    console.info("[VTubeStudioService] disconnect() stub called");
  }

  async setEmotion(emotion: Emotion): Promise<void> {
    // TODO: Map emotion states to VTube Studio expressions/hotkeys.
    console.info("[VTubeStudioService] setEmotion() stub called", { emotion });
  }

  async setSpeaking(speaking: boolean): Promise<void> {
    // TODO: Sync speaking state to mouth animation or idle/talk hotkeys.
    console.info("[VTubeStudioService] setSpeaking() stub called", { speaking });
  }

  async syncState(state: OverlayState): Promise<void> {
    // TODO: Keep avatar behavior aligned with controller state.
    console.info("[VTubeStudioService] syncState() stub called", {
      emotion: state.emotion,
      speaking: state.speaking
    });
  }
}
