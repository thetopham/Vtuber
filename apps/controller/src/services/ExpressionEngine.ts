import emotionMap from "../config/emotion-map.json";
import type {
  AvatarExpressionState,
  BaseExpression,
  InternalEmotion,
  OverlayExpression
} from "@vtuber/shared";
import { internalEmotionSchema } from "@vtuber/shared";
import type { AvatarAdapter } from "../adapters/AvatarAdapter";

const OVERLAY_DURATIONS_MS: Record<OverlayExpression | "shocked", number> = {
  wink: 1000,
  embarrassed: 3000,
  shocked: 2500
};

const ALLOWED_OVERLAY_COMBINATIONS: Record<BaseExpression, OverlayExpression[]> = {
  happy: ["embarrassed", "wink"],
  angry: [],
  approval: [],
  excited: ["embarrassed"],
  sad: [],
  shocked: ["embarrassed"]
};

const emotionMapTyped = emotionMap as Record<InternalEmotion, AvatarExpressionState>;

export class ExpressionEngine {
  private currentState: AvatarExpressionState = { base: "happy", overlays: [] };

  private timers = new Map<OverlayExpression | "shocked", NodeJS.Timeout>();

  private timerExpiry = new Map<OverlayExpression | "shocked", number>();

  constructor(private readonly adapter: AvatarAdapter) {}

  getCurrentState(): AvatarExpressionState {
    return this.currentState;
  }

  getActiveTimers(): Partial<Record<OverlayExpression | "shocked", number>> {
    const activeTimers: Partial<Record<OverlayExpression | "shocked", number>> = {};
    for (const [key, expiresAt] of this.timerExpiry.entries()) {
      activeTimers[key] = expiresAt;
    }
    return activeTimers;
  }

  normalizeEmotionInput(input: string): InternalEmotion {
    return internalEmotionSchema.parse(input.trim().toLowerCase());
  }

  buildExpressionState(emotion: InternalEmotion): AvatarExpressionState {
    return {
      base: emotionMapTyped[emotion].base,
      overlays: [...emotionMapTyped[emotion].overlays]
    };
  }

  buildExpressionPlan(nextState: AvatarExpressionState): AvatarExpressionState {
    const overlays = Array.from(new Set(nextState.overlays));
    const allowedOverlays = ALLOWED_OVERLAY_COMBINATIONS[nextState.base] ?? [];
    const invalid = overlays.filter((overlay) => !allowedOverlays.includes(overlay));

    if (invalid.length > 0) {
      console.warn("[ExpressionEngine] invalid overlay combo blocked", {
        base: nextState.base,
        invalid
      });
    }

    return {
      base: nextState.base,
      overlays: overlays.filter((overlay) => allowedOverlays.includes(overlay))
    };
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    this.clearTimers();
    const planned = this.buildExpressionPlan(state);
    await this.adapter.applyExpressionState(planned);
    this.currentState = planned;
    this.scheduleAutoClears(planned);
    return planned;
  }

  private scheduleAutoClears(state: AvatarExpressionState): void {
    for (const overlay of state.overlays) {
      const durationMs = OVERLAY_DURATIONS_MS[overlay];
      this.scheduleTimer(overlay, durationMs, async () => {
        console.info("[ExpressionEngine] overlay auto-clear", { overlay, durationMs });
        await this.applyExpressionState({
          base: this.currentState.base,
          overlays: this.currentState.overlays.filter((item) => item !== overlay)
        });
      });
    }

    if (state.base === "shocked") {
      const durationMs = OVERLAY_DURATIONS_MS.shocked;
      this.scheduleTimer("shocked", durationMs, async () => {
        console.info("[ExpressionEngine] shocked auto-clear", { durationMs });
        await this.applyExpressionState({ base: "happy", overlays: [] });
      });
    }
  }

  private scheduleTimer(
    key: OverlayExpression | "shocked",
    durationMs: number,
    callback: () => Promise<void>
  ): void {
    this.clearTimer(key);
    const timer = setTimeout(() => {
      this.timers.delete(key);
      this.timerExpiry.delete(key);
      void callback();
    }, durationMs);
    this.timers.set(key, timer);
    this.timerExpiry.set(key, Date.now() + durationMs);
  }

  private clearTimer(key: OverlayExpression | "shocked"): void {
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(key);
      this.timerExpiry.delete(key);
    }
  }

  private clearTimers(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.timerExpiry.clear();
  }
}
