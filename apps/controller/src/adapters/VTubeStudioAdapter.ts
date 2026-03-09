import type {
  AvatarExpressionState,
  BaseExpression,
  OverlayExpression
} from "@vtuber/shared";
import type {
  ActiveToggleState,
  AvatarAdapter,
  AvatarAdapterStatus,
  ExpressionTransitionPlan,
  ToggleExpression
} from "./AvatarAdapter";
import { VTubeStudioClient } from "../services/vtubeStudio";

const defaultExpressionState: AvatarExpressionState = {
  base: "happy",
  overlays: []
};

export class VTubeStudioAdapter implements AvatarAdapter {
  private readonly client: VTubeStudioClient;
  private readonly hotkeys: Record<BaseExpression | OverlayExpression, string>;
  private desiredExpressionState: AvatarExpressionState = defaultExpressionState;
  private actualActiveToggleState: ActiveToggleState = {
    angry: false,
    approval: false,
    embarrassed: false,
    excited: false,
    happy: false,
    sad: false,
    shocked: false,
    wink: false
  };
  private lastTransitionPlan: ExpressionTransitionPlan = {
    toDisable: [],
    toEnable: ["happy"]
  };
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
      desiredExpressionState: this.desiredExpressionState,
      actualActiveToggleState: { ...this.actualActiveToggleState },
      lastTransitionPlan: {
        toDisable: [...this.lastTransitionPlan.toDisable],
        toEnable: [...this.lastTransitionPlan.toEnable]
      },
      activeTimers
    };
  }

  public async clearAllExpressions(): Promise<void> {
    this.clearTimers();
    const toDisable = this.getActiveExpressions();
    console.info("[VTubeStudioAdapter] Clearing expressions", { toDisable });

    for (const expression of toDisable) {
      await this.toggle(expression, false);
    }

    this.lastTransitionPlan = {
      toDisable,
      toEnable: []
    };
  }

  public async resetToDefault(): Promise<void> {
    console.info("[VTubeStudioAdapter] Resetting to default expression");
    await this.applyExpressionState({ base: "happy", overlays: [] });
  }

  public async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    const desiredToggleState = this.buildDesiredToggleState(state);
    const transitionPlan = this.buildTransitionPlan(desiredToggleState);
    this.lastTransitionPlan = transitionPlan;

    console.info("[VTubeStudioAdapter] Computed expression transition plan", {
      desiredExpressionState: state,
      desiredToggleState,
      actualActiveToggleState: this.actualActiveToggleState,
      transitionPlan
    });

    for (const expression of transitionPlan.toDisable) {
      await this.toggle(expression, false);
    }

    if (transitionPlan.toEnable.includes("happy")) {
      await this.toggle("happy", true);
    }

    if (state.base !== "happy" && transitionPlan.toEnable.includes(state.base)) {
      await this.toggle(state.base, true);
    }

    for (const overlay of state.overlays) {
      if (!transitionPlan.toEnable.includes(overlay)) {
        continue;
      }

      await this.toggle(overlay, true);
    }

    this.desiredExpressionState = {
      base: state.base,
      overlays: [...state.overlays],
      ...(state.durationMs ? { durationMs: state.durationMs } : {})
    };

    this.setupAutoClear(state);
    console.info("[VTubeStudioAdapter] Applied expression state", {
      desiredExpressionState: this.desiredExpressionState,
      actualActiveToggleState: this.actualActiveToggleState
    });
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

        const nextOverlays = this.desiredExpressionState.overlays.filter((item) => item !== expression);
        await this.applyExpressionState({
          base: this.desiredExpressionState.base,
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

  private buildDesiredToggleState(state: AvatarExpressionState): ActiveToggleState {
    const desiredState: ActiveToggleState = {
      angry: false,
      approval: false,
      embarrassed: false,
      excited: false,
      happy: false,
      sad: false,
      shocked: false,
      wink: false
    };

    desiredState[state.base] = true;
    state.overlays.forEach((overlay) => {
      desiredState[overlay] = true;
    });

    return desiredState;
  }

  private buildTransitionPlan(desiredToggleState: ActiveToggleState): ExpressionTransitionPlan {
    const allExpressions = Object.keys(this.actualActiveToggleState) as ToggleExpression[];
    const toDisable = allExpressions.filter(
      (expression) => this.actualActiveToggleState[expression] && !desiredToggleState[expression]
    );
    const toEnable = allExpressions.filter(
      (expression) => !this.actualActiveToggleState[expression] && desiredToggleState[expression]
    );

    return { toDisable, toEnable };
  }

  private getActiveExpressions(): ToggleExpression[] {
    return (Object.keys(this.actualActiveToggleState) as ToggleExpression[]).filter(
      (expression) => this.actualActiveToggleState[expression]
    );
  }

  private async toggle(expression: ToggleExpression, nextActiveState: boolean): Promise<void> {
    const hotkeyID = this.hotkeys[expression];
    if (!hotkeyID) {
      throw new Error(`Missing VTube Studio hotkey id for expression: ${expression}`);
    }

    console.info("[VTubeStudioAdapter] Toggling expression", {
      expression,
      action: nextActiveState ? "enable" : "disable",
      hotkeyID
    });
    await this.client.triggerHotkey(hotkeyID);
    this.actualActiveToggleState[expression] = nextActiveState;
  }
}
