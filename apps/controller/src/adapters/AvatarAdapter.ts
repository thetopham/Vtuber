import type { AvatarExpressionState } from "@vtuber/shared";

export type AvatarAdapterStatus = {
  connected: boolean;
  authenticated: boolean;
  currentExpressionState: AvatarExpressionState;
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
