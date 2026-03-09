import type {
  AvatarExpressionState,
  BaseExpression,
  OverlayExpression
} from "@vtuber/shared";
import type {
  ActiveToggleState,
  AvatarAdapter,
  AvatarAdapterStatus,
  ExpressionToggle,
  ExpressionTransitionPlan
} from "./AvatarAdapter";
import { VTubeStudioClient } from "../services/vtubeStudio";

const defaultExpressionState: AvatarExpressionState = {
  base: "happy",
  overlays: []
};

const allExpressionToggles: ReadonlyArray<ExpressionToggle> = [
  "angry",
  "approval",
  "embarrassed",
  "excited",
  "happy",
  "sad",
  "shocked",
  "wink"
];

const defaultToggleState: ActiveToggleState = {
  angry: false,
  approval: false,
  embarrassed: false,
  excited: false,
  happy: true,
  sad: false,
  shocked: false,
  wink: false
};

export class VTubeStudioAdapter implements AvatarAdapter {
  private readonly client: VTubeStudioClient;
  private readonly hotkeys: Record<BaseExpression | OverlayExpression, string>;
  private desiredExpressionState: AvatarExpressionState = defaultExpressionState;
  private activeToggleState: ActiveToggleState = { ...defaultToggleState };
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
      activeToggleState: { ...this.activeToggleState },
      lastTransitionPlan: {
        toDisable: [...this.lastTransitionPlan.toDisable],
        toEnable: [...this.lastTransitionPlan.toEnable]
      },
      activeTimers
    };
  }

  public async clearAllExpressions(): Promise<void> {
    this.clearTimers();
    console.info("[VTubeStudioAdapter] Clearing expressions");

    const toDisable = allExpressionToggles.filter((toggle) => this.activeToggleState[toggle]);
    this.lastTransitionPlan = { toDisable, toEnable: [] };
    console.info("[VTubeStudioAdapter] Computed transition plan", this.lastTransitionPlan);

    for (const expression of toDisable) {
      await this.toggleOff(expression);
    }

    this.desiredExpressionState = { base: "happy", overlays: [] };
  }

  public async resetToDefault(): Promise<void> {
    console.info("[VTubeStudioAdapter] Resetting to default expression");
    await this.clearAllExpressions();
    await this.applyExpressionState({ base: "happy", overlays: [] });
  }

  public async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    const nextState: AvatarExpressionState = {
      base: state.base,
      overlays: [...state.overlays],
      ...(state.durationMs ? { durationMs: state.durationMs } : {})
    };

    const desiredToggles = this.getDesiredToggleSet(nextState);
    const transitionPlan = this.computeTransitionPlan(desiredToggles);
    this.lastTransitionPlan = transitionPlan;

    console.info("[VTubeStudioAdapter] Computed transition plan", {
      desiredState: nextState,
      desiredToggles: Array.from(desiredToggles),
      activeToggleState: this.activeToggleState,
      transitionPlan
    });

    for (const expression of transitionPlan.toDisable) {
      this.clearTimer(expression);
      await this.toggleOff(expression);
    }

    if (transitionPlan.toEnable.includes("happy")) {
      await this.toggleOn("happy");
    }

    const baseExpression = nextState.base;
    if (baseExpression !== "happy" && transitionPlan.toEnable.includes(baseExpression)) {
      await this.toggleOn(baseExpression);
    }

    for (const overlay of nextState.overlays) {
      if (transitionPlan.toEnable.includes(overlay)) {
        await this.toggleOn(overlay);
      }
    }

    this.desiredExpressionState = nextState;
    this.setupAutoClear(nextState);
    console.info("[VTubeStudioAdapter] Applied expression state", {
      desiredExpressionState: this.desiredExpressionState,
      activeToggleState: this.activeToggleState
    });
  }

  private getDesiredToggleSet(state: AvatarExpressionState): Set<ExpressionToggle> {
    return new Set<ExpressionToggle>([state.base, ...state.overlays]);
  }

  private computeTransitionPlan(desired: Set<ExpressionToggle>): ExpressionTransitionPlan {
    const toDisable = allExpressionToggles.filter((toggle) => this.activeToggleState[toggle] && !desired.has(toggle));
    const toEnable = allExpressionToggles.filter((toggle) => desired.has(toggle) && !this.activeToggleState[toggle]);
    return { toDisable, toEnable };
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

  private clearTimer(expression: OverlayExpression | BaseExpression): void {
    const timer = this.activeTimers.get(expression);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.activeTimers.delete(expression);
  }

  private async toggleOn(expression: ExpressionToggle): Promise<void> {
    console.info("[VTubeStudioAdapter] Toggle ON", { expression });
    await this.trigger(expression);
    this.activeToggleState[expression] = true;
  }

  private async toggleOff(expression: ExpressionToggle): Promise<void> {
    console.info("[VTubeStudioAdapter] Toggle OFF", { expression });
    await this.trigger(expression);
    this.activeToggleState[expression] = false;
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
