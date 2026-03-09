import emotionMap from "../config/emotion-map.json";
import type {
  AvatarExpressionState,
  BaseExpression,
  InternalEmotion,
  OverlayExpression
} from "@vtuber/shared";
import type { AvatarAdapter } from "../adapters/AvatarAdapter";

type ExpressionPlan = {
  state: AvatarExpressionState;
  rejectedOverlays: OverlayExpression[];
};

const overlayDurations: Record<OverlayExpression, number> = {
  wink: 1000,
  embarrassed: 3000
};

const allowedOverlayByBase: Partial<Record<BaseExpression, OverlayExpression[]>> = {
  happy: ["embarrassed", "wink"],
  excited: ["embarrassed"],
  shocked: ["embarrassed"]
};

export class ExpressionEngine {
  private currentState: AvatarExpressionState = { base: "happy", overlays: [] };
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly adapter: AvatarAdapter) {}

  normalizeEmotionInput(input: string): InternalEmotion {
    const normalized = input.trim().toLowerCase();

    if (normalized === "approval") {
      return "pouting";
    }

    if (!(normalized in emotionMap)) {
      throw new Error(`Unsupported emotion: ${input}`);
    }

    return normalized as InternalEmotion;
  }

  buildExpressionState(emotion: InternalEmotion): AvatarExpressionState {
    return emotionMap[emotion] as AvatarExpressionState;
  }

  buildExpressionPlan(
    nextState: AvatarExpressionState,
    currentState: AvatarExpressionState
  ): ExpressionPlan {
    const allowedOverlays = allowedOverlayByBase[nextState.base] ?? [];
    const uniqueOverlays = [...new Set(nextState.overlays)];
    const accepted = uniqueOverlays.filter((overlay) => allowedOverlays.includes(overlay));
    const rejectedOverlays = uniqueOverlays.filter((overlay) => !accepted.includes(overlay));

    if (rejectedOverlays.length > 0) {
      console.warn("[ExpressionEngine] invalid overlay combination", {
        nextState,
        currentState,
        rejectedOverlays
      });
    }

    return {
      state: {
        ...nextState,
        overlays: accepted
      },
      rejectedOverlays
    };
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    const { state: plannedState } = this.buildExpressionPlan(state, this.currentState);

    this.clearTimer("shocked");
    for (const overlay of ["wink", "embarrassed"] as OverlayExpression[]) {
      if (!plannedState.overlays.includes(overlay)) {
        this.clearTimer(overlay);
      }
    }

    console.info("[ExpressionEngine] resetting expression state");
    await this.adapter.applyExpressionState(plannedState);
    this.currentState = plannedState;

    for (const overlay of plannedState.overlays) {
      this.scheduleOverlayClear(overlay);
    }

    if (plannedState.base === "shocked") {
      this.scheduleShockedClear();
    }

    return this.currentState;
  }

  getCurrentState(): AvatarExpressionState {
    return this.currentState;
  }

  getActiveTimers(): string[] {
    return [...this.timers.keys()];
  }

  private scheduleOverlayClear(overlay: OverlayExpression): void {
    this.clearTimer(overlay);

    const timer = setTimeout(async () => {
      try {
        const nextState: AvatarExpressionState = {
          ...this.currentState,
          overlays: this.currentState.overlays.filter((item) => item !== overlay)
        };
        console.info("[ExpressionEngine] timer clearing overlay", { overlay });
        await this.applyExpressionState(nextState);
      } finally {
        this.timers.delete(overlay);
      }
    }, overlayDurations[overlay]);

    this.timers.set(overlay, timer);
  }

  private scheduleShockedClear(): void {
    this.clearTimer("shocked");

    const timer = setTimeout(async () => {
      try {
        console.info("[ExpressionEngine] timer clearing shocked base");
        await this.applyExpressionState({ base: "happy", overlays: [] });
      } finally {
        this.timers.delete("shocked");
      }
    }, 2500);

    this.timers.set("shocked", timer);
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.timers.delete(key);
  }
}
