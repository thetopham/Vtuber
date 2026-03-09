import type { AvatarExpressionState, AvatarToggle } from "@vtuber/shared";
import {
  avatarExpressionStateSchema,
  avatarToggles
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
  active: ["neutral"]
};

function createEmptyToggleState(): ActiveToggleState {
  return {
    angry: false,
    approval: false,
    embarrassed: false,
    excited: false,
    happy: false,
    neutral: false,
    sad: false,
    shocked: false,
    wink: false
  };
}

export class VTubeStudioAdapter implements AvatarAdapter {
  private readonly client: VTubeStudioClient;
  private readonly hotkeys: Record<AvatarToggle, string>;
  private desiredExpressionState: AvatarExpressionState = defaultExpressionState;
  private actualActiveToggleState: ActiveToggleState = createEmptyToggleState();
  private lastTransitionPlan: ExpressionTransitionPlan = {
    toDisable: [],
    toEnable: ["neutral"]
  };
  private activeTimers = new Map<string, NodeJS.Timeout>();

  public constructor(args: {
    client: VTubeStudioClient;
    hotkeys: Record<AvatarToggle, string>;
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

    this.desiredExpressionState = { active: [] };
    this.lastTransitionPlan = {
      toDisable,
      toEnable: []
    };
  }

  public async resetToDefault(): Promise<void> {
    console.info("[VTubeStudioAdapter] Resetting to default expression state");
    await this.applyExpressionState(defaultExpressionState);
  }

  public async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    const parsed = avatarExpressionStateSchema.parse(state);
    const desiredToggleState = this.buildDesiredToggleState(parsed);
    const transitionPlan = this.buildTransitionPlan(desiredToggleState);
    this.lastTransitionPlan = transitionPlan;

    if (transitionPlan.toDisable.length === 0 && transitionPlan.toEnable.length === 0) {
      console.info("[VTubeStudioAdapter] Expression state unchanged; skipping", {
        state: parsed
      });
      this.setupDurationReset(parsed);
      return;
    }

    console.info("[VTubeStudioAdapter] Reconciling expression toggles", {
      desiredExpressionState: parsed,
      desiredToggleState,
      actualActiveToggleState: this.actualActiveToggleState,
      transitionPlan
    });

    for (const expression of transitionPlan.toDisable) {
      await this.toggle(expression, false);
    }

    for (const expression of transitionPlan.toEnable) {
      await this.toggle(expression, true);
    }

    this.desiredExpressionState = {
      active: [...parsed.active],
      ...(parsed.durationMs ? { durationMs: parsed.durationMs } : {})
    };

    this.setupDurationReset(parsed);
    console.info("[VTubeStudioAdapter] Applied expression state", {
      desiredExpressionState: this.desiredExpressionState,
      actualActiveToggleState: this.actualActiveToggleState
    });
  }

  private setupDurationReset(state: AvatarExpressionState): void {
    const key = "state-duration-reset";
    const existing = this.activeTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.activeTimers.delete(key);
    }

    if (!state.durationMs) {
      return;
    }

    const timeout = setTimeout(async () => {
      this.activeTimers.delete(key);
      await this.applyExpressionState(defaultExpressionState);
      console.info("[VTubeStudioAdapter] Duration elapsed; reset to default expression state");
    }, state.durationMs);

    this.activeTimers.set(key, timeout);
  }

  private clearTimers(): void {
    this.activeTimers.forEach((timeout) => clearTimeout(timeout));
    this.activeTimers.clear();
  }

  private buildDesiredToggleState(state: AvatarExpressionState): ActiveToggleState {
    const desiredState = createEmptyToggleState();
    for (const toggle of state.active) {
      desiredState[toggle] = true;
    }

    return desiredState;
  }

  private buildTransitionPlan(desiredToggleState: ActiveToggleState): ExpressionTransitionPlan {
    const allExpressions = avatarToggles as readonly ToggleExpression[];
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
