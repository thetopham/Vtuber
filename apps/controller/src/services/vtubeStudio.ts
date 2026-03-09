import type { AvatarExpressionState, AvatarStatus } from "@vtuber/shared";
import { avatarExpressionStateSchema } from "@vtuber/shared";
import { VTubeStudioAdapter } from "../adapters/VTubeStudioAdapter";
import { ExpressionEngine } from "./ExpressionEngine";

export class VTubeStudioService {
  private readonly adapter: VTubeStudioAdapter;

  private readonly expressionEngine: ExpressionEngine;

  constructor(
    wsUrl: string,
    pluginName: string,
    pluginDeveloper: string
  ) {
    this.adapter = new VTubeStudioAdapter(wsUrl, pluginName, pluginDeveloper);
    this.expressionEngine = new ExpressionEngine(this.adapter);
  }

  async connect(): Promise<void> {
    try {
      await this.adapter.connect();
    } catch (error) {
      console.warn("[VTubeStudioService] connect/auth failed; running without VTS link", {
        error: String(error)
      });
    }
  }

  getStatus(): AvatarStatus {
    const status = this.adapter.getStatus();
    return {
      ...status,
      currentState: this.expressionEngine.getCurrentState(),
      activeTimers: this.expressionEngine.getActiveTimers()
    };
  }

  async applyEmotion(emotion: string): Promise<AvatarExpressionState> {
    const normalized = this.expressionEngine.normalizeEmotionInput(emotion);
    const state = this.expressionEngine.buildExpressionState(normalized);
    return await this.expressionEngine.applyExpressionState(state);
  }

  async applyExpressionState(input: AvatarExpressionState): Promise<AvatarExpressionState> {
    const state = avatarExpressionStateSchema.parse(input);
    return await this.expressionEngine.applyExpressionState(state);
  }
}
