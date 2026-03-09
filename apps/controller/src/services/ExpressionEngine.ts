import type {
  AvatarExpressionState,
  BaseExpression,
  InternalEmotion,
  OverlayExpression
} from "@vtuber/shared";
import emotionMap from "../config/emotion-map.json";
import type { AvatarAdapter } from "../adapters/AvatarAdapter";

type ExpressionPlan = {
  requested: AvatarExpressionState;
  base: BaseExpression;
  overlays: OverlayExpression[];
};

const allowedCombos = new Set([
  "happy:embarrassed",
  "happy:wink",
  "excited:embarrassed",
  "shocked:embarrassed"
]);

const overlayDurationMs: Record<OverlayExpression, number> = {
  wink: 1000,
  embarrassed: 3000
};

const shockedAutoClearMs = 2500;

export class ExpressionEngine {
  private currentState: AvatarExpressionState = { base: "happy", overlays: [] };

  private overlayTimers = new Map<OverlayExpression, NodeJS.Timeout>();

  private shockedTimer: NodeJS.Timeout | null = null;

  constructor(private readonly adapter: AvatarAdapter) {}

  normalizeEmotionInput(input: string): InternalEmotion {
    const normalized = input.trim().toLowerCase();

    if (normalized === "approval") {
      return "pouting";
    }

    if (Object.prototype.hasOwnProperty.call(emotionMap, normalized)) {
      return normalized as InternalEmotion;
    }

    throw new Error(`Unsupported emotion: ${input}`);
  }

  buildExpressionState(emotion: InternalEmotion): AvatarExpressionState {
    const mapped = emotionMap[emotion];
    return {
      base: mapped.base as BaseExpression,
      overlays: mapped.overlays as OverlayExpression[]
    };
  }

  buildExpressionPlan(
    nextState: AvatarExpressionState,
    currentState: AvatarExpressionState
  ): ExpressionPlan {
    const uniqueOverlays = [...new Set(nextState.overlays)];

    uniqueOverlays.forEach((overlay) => {
      const key = `${nextState.base}:${overlay}`;
      if (!allowedCombos.has(key)) {
        console.warn("[ExpressionEngine] Invalid overlay combination, dropping", {
          base: nextState.base,
          overlay,
          currentState
        });
      }
    });

    const filteredOverlays = uniqueOverlays.filter((overlay) =>
      allowedCombos.has(`${nextState.base}:${overlay}`)
    );

    return {
      requested: nextState,
      base: nextState.base,
      overlays: filteredOverlays
    };
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    const plan = this.buildExpressionPlan(state, this.currentState);

    this.clearTimers();

    console.info("[ExpressionEngine] Reset expression state");
    await this.adapter.clearAllExpressions();
    await this.adapter.resetToDefault();

    console.info("[ExpressionEngine] Applying expression state", plan);
    await this.adapter.applyExpressionState({
      base: plan.base,
      overlays: plan.overlays,
      durationMs: plan.requested.durationMs
    });

    this.currentState = { base: plan.base, overlays: plan.overlays };

    this.scheduleOverlayAutoClear();
    this.scheduleShockedAutoClear();

    return this.currentState;
  }

  getCurrentState(): AvatarExpressionState {
    return this.currentState;
  }

  getTimerStatus(): Partial<Record<OverlayExpression | "shocked", number>> {
    const timers: Partial<Record<OverlayExpression | "shocked", number>> = {};

    this.overlayTimers.forEach((timer, key) => {
      timers[key] = Number(timer);
    });

    if (this.shockedTimer) {
      timers.shocked = Number(this.shockedTimer);
    }

    return timers;
  }

  private scheduleOverlayAutoClear(): void {
    this.currentState.overlays.forEach((overlay) => {
      const durationMs = overlayDurationMs[overlay];
      const timer = setTimeout(async () => {
        console.info("[ExpressionEngine] Auto-clearing overlay", { overlay, durationMs });
        this.overlayTimers.delete(overlay);
        const nextOverlays = this.currentState.overlays.filter((item) => item !== overlay);
        await this.applyExpressionState({ base: this.currentState.base, overlays: nextOverlays });
      }, durationMs);

      this.overlayTimers.set(overlay, timer);
    });
  }

  private scheduleShockedAutoClear(): void {
    if (this.currentState.base !== "shocked") {
      return;
    }

    this.shockedTimer = setTimeout(async () => {
      console.info("[ExpressionEngine] Auto-clearing shocked base", {
        durationMs: shockedAutoClearMs
      });
      this.shockedTimer = null;
      await this.applyExpressionState({ base: "happy", overlays: [] });
    }, shockedAutoClearMs);
  }

  private clearTimers(): void {
    this.overlayTimers.forEach((timer) => clearTimeout(timer));
    this.overlayTimers.clear();

    if (this.shockedTimer) {
      clearTimeout(this.shockedTimer);
      this.shockedTimer = null;
    }
  }
}
