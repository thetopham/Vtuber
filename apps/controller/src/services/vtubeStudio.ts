import type {
  AvatarAdapterStatus,
  AvatarExpressionState,
  Emotion,
  OverlayState
} from "@vtuber/shared";
import { VTubeStudioAdapter } from "../adapters/VTubeStudioAdapter";
import { env } from "../env";
import { ExpressionEngine } from "./ExpressionEngine";

export class VTubeStudioService {
  private readonly adapter = new VTubeStudioAdapter(
    env.vtubeStudioWsUrl,
    env.vtubeStudioTokenPath,
    env.vtubeStudioAuthToken
  );

  private readonly expressionEngine = new ExpressionEngine(this.adapter);

  async connect(): Promise<void> {
    try {
      await this.adapter.connect();
    } catch (error) {
      console.error("[VTubeStudioService] Failed to connect", error);
    }
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  getStatus(): AvatarAdapterStatus {
    const status = this.adapter.getStatus();
    return {
      ...status,
      activeState: this.expressionEngine.getCurrentState(),
      activeTimers: this.expressionEngine.getTimerStatus()
    };
  }

  async setEmotion(emotion: Emotion): Promise<void> {
    const state = this.expressionEngine.buildExpressionState(emotion);
    await this.expressionEngine.applyExpressionState(state);
  }

  async setSpeaking(_speaking: boolean): Promise<void> {
    // reserved for future lip sync integrations
  }

  async syncState(state: OverlayState): Promise<void> {
    await this.setEmotion(state.emotion);
  }

  normalizeEmotionInput(input: string): Emotion {
    return this.expressionEngine.normalizeEmotionInput(input);
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    return this.expressionEngine.applyExpressionState(state);
  }

  buildExpressionState(emotion: Emotion): AvatarExpressionState {
    return this.expressionEngine.buildExpressionState(emotion);
  }
}
