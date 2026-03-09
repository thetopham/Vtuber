import emotionMap from "../config/emotion-map.json";
import {
  avatarExpressionStateSchema,
  type AvatarExpressionState,
  type InternalEmotion,
  type OverlayExpression
} from "@vtuber/shared";
import type { AvatarAdapter } from "../adapters/AvatarAdapter";

const allowedOverlays: OverlayExpression[] = ["embarrassed", "wink"];

const allowedCombos = new Set([
  "happy+embarrassed",
  "happy+wink",
  "excited+embarrassed",
  "shocked+embarrassed"
]);

export class ExpressionEngine {
  private readonly adapter: AvatarAdapter;
  private currentState: AvatarExpressionState = { base: "happy", overlays: [] };

  public constructor(adapter: AvatarAdapter) {
    this.adapter = adapter;
  }

  public normalizeEmotionInput(input: string): InternalEmotion {
    const normalized = input.trim().toLowerCase();
    const aliases: Record<string, InternalEmotion> = {
      approval: "pouting",
      blush: "embarrassed",
      surprised: "shocked",
      smile: "happy"
    };

    const resolved = aliases[normalized] ?? normalized;
    if (!(resolved in emotionMap)) {
      throw new Error(`Unsupported emotion input: ${input}`);
    }

    return resolved as InternalEmotion;
  }

  public buildExpressionState(emotion: InternalEmotion): AvatarExpressionState {
    const mapped = emotionMap[emotion as keyof typeof emotionMap];
    return avatarExpressionStateSchema.parse(mapped);
  }

  public buildExpressionPlan(
    nextState: AvatarExpressionState,
    currentState: AvatarExpressionState
  ): AvatarExpressionState {
    if (nextState.base !== currentState.base || nextState.overlays.join(",") !== currentState.overlays.join(",")) {
      const overlays = nextState.overlays.filter((overlay) => allowedOverlays.includes(overlay));

      if (overlays.length !== nextState.overlays.length) {
        throw new Error("Only embarrassed and wink overlays are supported in v1");
      }

      if (overlays.length > 0) {
        overlays.forEach((overlay) => {
          const key = `${nextState.base}+${overlay}`;
          if (!allowedCombos.has(key)) {
            console.warn("[ExpressionEngine] Invalid combination attempt", {
              base: nextState.base,
              overlay
            });
            throw new Error(`Unsupported base/overlay combination: ${key}`);
          }
        });
      }
    }

    return {
      base: nextState.base,
      overlays: [...nextState.overlays],
      ...(nextState.durationMs ? { durationMs: nextState.durationMs } : {})
    };
  }

  public async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    const parsed = avatarExpressionStateSchema.parse(state);
    const plan = this.buildExpressionPlan(parsed, this.currentState);
    await this.adapter.applyExpressionState(plan);
    this.currentState = plan;
    return this.currentState;
  }

  public getCurrentState(): AvatarExpressionState {
    return this.currentState;
  }
}
