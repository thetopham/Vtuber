import type {
  AvatarExpressionState,
  BaseExpression,
  OverlayExpression
} from "@vtuber/shared";
import type { AvatarAdapter, AvatarAdapterStatus } from "./AvatarAdapter";
import { VTubeStudioClient } from "../services/vtubeStudio";

const defaultExpressionState: AvatarExpressionState = {
  base: "happy",
  overlays: []
};

const allExpressions: ReadonlyArray<BaseExpression | OverlayExpression> = [
  "happy",
  "angry",
  "approval",
  "excited",
  "sad",
  "shocked",
  "embarrassed",
  "wink"
];

export class VTubeStudioAdapter implements AvatarAdapter {
  private readonly client: VTubeStudioClient;
  private readonly hotkeys: Record<BaseExpression | OverlayExpression, string>;
  private currentExpressionState: AvatarExpressionState = defaultExpressionState;
  private activeTimers = new Map<OverlayExpression | BaseExpression, NodeJS.Timeout>();

  public constructor(args: {
    client: VTubeStudioClient;
    hotkeys: Record<BaseExpression | OverlayExpression, string>;
  }) {
    this.client = args.client;
    this.hotkeys = args.hotkeys;
  }

  public async connect(): Promise<void> {
    await this.client.connect();
    await this.client.authenticate();
  }

  public async disconnect(): Promise<void> {
    this.clearTimers();
    await this.client.disconnect();
  }

  public getStatus(): AvatarAdapterStatus {
    const activeTimers: Record<string, number> = {};
    this.activeTimers.forEach((_timeout, key) => {
      activeTimers[key] = 1;
    });

    return {
      connected: this.client.isConnected(),
      authenticated: this.client.isAuthenticated(),
      currentExpressionState: this.currentExpressionState,
      activeTimers
    };
  }

  public async clearAllExpressions(): Promise<void> {
    this.clearTimers();
    console.info("[VTubeStudioAdapter] Clearing expressions");
    const activeExpressions = this.getActiveExpressions(this.currentExpressionState);
    for (const expression of activeExpressions) {
      await this.trigger(expression);
    }

    this.currentExpressionState = { base: "happy", overlays: [] };
  }

  public async resetToDefault(): Promise<void> {
    console.info("[VTubeStudioAdapter] Resetting to default expression");
    await this.clearAllExpressions();
    this.currentExpressionState = { base: "happy", overlays: [] };
  }

  public async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    const nextState: AvatarExpressionState = {
      base: state.base,
      overlays: [...state.overlays],
      ...(state.durationMs ? { durationMs: state.durationMs } : {})
    };

    const currentlyActive = this.getActiveExpressions(this.currentExpressionState);
    const nextActive = this.getActiveExpressions(nextState);

    for (const expression of currentlyActive) {
      if (!nextActive.has(expression)) {
        this.clearTimer(expression);
        await this.trigger(expression);
      }
    }

    for (const expression of allExpressions) {
      if (nextActive.has(expression) && !currentlyActive.has(expression)) {
        await this.trigger(expression);
      }
    }

    this.currentExpressionState = {
      base: nextState.base,
      overlays: [...nextState.overlays],
      ...(nextState.durationMs ? { durationMs: nextState.durationMs } : {})
    };

    this.setupAutoClear(nextState);
    console.info("[VTubeStudioAdapter] Applied expression state", nextState);
  }

  private getActiveExpressions(state: AvatarExpressionState): Set<BaseExpression | OverlayExpression> {
    return new Set([state.base, ...state.overlays]);
  }

  private setupAutoClear(state: AvatarExpressionState): void {
    const overlayDurations: Partial<Record<OverlayExpression | BaseExpression, number>> = {
      wink: 1000,
      embarrassed: 3000,
      shocked: 2500
    };

    const timedKeys: Array<OverlayExpression | BaseExpression> = [
      ...state.overlays,
      ...(state.base === "shocked" ? ["shocked" as const] : [])
    ];

    timedKeys.forEach((expression) => {
      const duration = overlayDurations[expression];
      if (!duration) {
        return;
      }

      const existing = this.activeTimers.get(expression);
      if (existing) {
        clearTimeout(existing);
      }

      const timeout = setTimeout(async () => {
        this.activeTimers.delete(expression);

        if (expression === "shocked") {
          await this.applyExpressionState({ base: "happy", overlays: [] });
          console.info("[VTubeStudioAdapter] Auto-cleared shocked");
          return;
        }

        const nextOverlays = this.currentExpressionState.overlays.filter((item) => item !== expression);
        await this.applyExpressionState({
          base: this.currentExpressionState.base,
          overlays: nextOverlays
        });
        console.info("[VTubeStudioAdapter] Auto-cleared overlay", { expression });
      }, duration);

      this.activeTimers.set(expression, timeout);
    });
  }

  private clearTimers(): void {
    this.activeTimers.forEach((timeout) => clearTimeout(timeout));
    this.activeTimers.clear();
  }

  private clearTimer(expression: OverlayExpression | BaseExpression): void {
    const timer = this.activeTimers.get(expression);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.activeTimers.delete(expression);
  }

  private async trigger(expression: BaseExpression | OverlayExpression): Promise<void> {
    const hotkeyID = this.hotkeys[expression];
    if (!hotkeyID) {
      throw new Error(`Missing VTube Studio hotkey id for expression: ${expression}`);
    }

    console.info("[VTubeStudioAdapter] Triggering expression hotkey", {
      expression,
      hotkeyID
    });
    await this.client.triggerHotkey(hotkeyID);
  }
}
