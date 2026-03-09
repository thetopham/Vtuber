import type { AvatarExpressionState, InternalEmotion } from "@vtuber/shared";
import { VTubeStudioAdapter } from "../adapters/VTubeStudioAdapter";
import { ExpressionEngine } from "./ExpressionEngine";

const cycle: InternalEmotion[] = [
  "neutral",
  "angry",
  "pouting",
  "embarrassed",
  "excited",
  "happy",
  "sad",
  "shocked",
  "wink"
];

export class VTubeStudioService {
  private readonly adapter = new VTubeStudioAdapter();
  private readonly engine = new ExpressionEngine(this.adapter);

  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  async applyEmotion(emotionInput: string): Promise<AvatarExpressionState> {
    const normalized = this.engine.normalizeEmotionInput(emotionInput);
    const state = this.engine.buildExpressionState(normalized);
    return await this.engine.applyExpressionState(state);
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    return await this.engine.applyExpressionState(state);
  }

  async runTestCycle(): Promise<void> {
    let delay = 0;

    for (const emotion of cycle) {
      setTimeout(() => {
        void this.applyEmotion(emotion);
      }, delay);
      delay += 1400;
    }
  }

  getStatus(): {
    connected: boolean;
    authenticated: boolean;
    currentExpressionState: AvatarExpressionState;
    activeExpressions: string[];
    activeTimers: string[];
  } {
    const status = this.adapter.getStatus();

    return {
      connected: status.connected,
      authenticated: status.authenticated,
      currentExpressionState: this.engine.getCurrentState(),
      activeExpressions: status.activeExpressions,
      activeTimers: this.engine.getActiveTimers()
    };
  }
}
