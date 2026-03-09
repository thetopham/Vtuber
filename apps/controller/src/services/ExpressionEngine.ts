import emotionMap from "../config/emotion-map.json";
import {
  avatarExpressionStateSchema,
  avatarToggleMetadata,
  type AvatarExpressionState,
  type AvatarToggle,
  type InternalEmotion
} from "@vtuber/shared";
import type { AvatarAdapter } from "../adapters/AvatarAdapter";

const defaultState: AvatarExpressionState = { active: ["neutral"] };
const metadataByToggle = new Map(avatarToggleMetadata.map((item) => [item.name, item]));

export class ExpressionEngine {
  private readonly adapter: AvatarAdapter;
  private currentState: AvatarExpressionState = defaultState;

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

  public normalizeExpressionState(input: AvatarExpressionState): AvatarExpressionState {
    const parsed = avatarExpressionStateSchema.parse(input);
    const deduped = Array.from(new Set(parsed.active));

    let active = [...deduped];

    if (active.length > 1 && active.includes("neutral")) {
      active = active.filter((toggle) => toggle !== "neutral");
    }

    const filtered: AvatarToggle[] = [];
    for (const toggle of active) {
      const conflicts = metadataByToggle.get(toggle)?.conflictsWith ?? [];
      const conflictsWithExisting = filtered.find((existing) => conflicts.includes(existing));
      if (conflictsWithExisting) {
        console.warn("[ExpressionEngine] Removing conflicting toggle", {
          removed: toggle,
          conflictsWith: conflictsWithExisting
        });
        continue;
      }

      filtered.push(toggle);
    }

    const normalizedActive: AvatarToggle[] = filtered.length > 0 ? filtered : ["neutral"];

    return {
      active: normalizedActive,
      ...(parsed.durationMs ? { durationMs: parsed.durationMs } : {})
    };
  }

  public async applyExpressionState(state: AvatarExpressionState): Promise<AvatarExpressionState> {
    const normalized = this.normalizeExpressionState(state);

    if (this.isSameState(this.currentState, normalized)) {
      return this.currentState;
    }

    await this.adapter.applyExpressionState(normalized);
    this.currentState = normalized;
    return this.currentState;
  }

  public getCurrentState(): AvatarExpressionState {
    return this.currentState;
  }

  private isSameState(left: AvatarExpressionState, right: AvatarExpressionState): boolean {
    const leftActive = [...left.active].sort();
    const rightActive = [...right.active].sort();
    return leftActive.join(",") === rightActive.join(",") && left.durationMs === right.durationMs;
  }
}
