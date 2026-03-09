import type { AvatarExpressionState } from "@vtuber/shared";

export type ExpressionToggle =
  | "angry"
  | "approval"
  | "embarrassed"
  | "excited"
  | "happy"
  | "sad"
  | "shocked"
  | "wink";

export type ActiveToggleState = Record<ExpressionToggle, boolean>;

export type ExpressionTransitionPlan = {
  toDisable: ExpressionToggle[];
  toEnable: ExpressionToggle[];
};

export type AvatarAdapterStatus = {
  connected: boolean;
  authenticated: boolean;
  desiredExpressionState: AvatarExpressionState;
  activeToggleState: ActiveToggleState;
  lastTransitionPlan: ExpressionTransitionPlan;
  activeTimers: Record<string, number>;
};

export interface AvatarAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): AvatarAdapterStatus;
  resetToDefault(): Promise<void>;
  applyExpressionState(state: AvatarExpressionState): Promise<void>;
  clearAllExpressions(): Promise<void>;
}
