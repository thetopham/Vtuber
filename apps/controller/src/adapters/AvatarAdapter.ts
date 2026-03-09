import type { AvatarExpressionState } from "@vtuber/shared";

export type ToggleExpression =
  | "angry"
  | "approval"
  | "embarrassed"
  | "excited"
  | "happy"
  | "sad"
  | "shocked"
  | "wink";

export type ActiveToggleState = Record<ToggleExpression, boolean>;

export type ExpressionTransitionPlan = {
  toDisable: ToggleExpression[];
  toEnable: ToggleExpression[];
};

export type AvatarAdapterStatus = {
  connected: boolean;
  authenticated: boolean;
  desiredExpressionState: AvatarExpressionState;
  actualActiveToggleState: ActiveToggleState;
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
