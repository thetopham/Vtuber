import type { AvatarExpressionState, AvatarStatus } from "@vtuber/shared";

export interface AvatarAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): AvatarStatus;
  resetToDefault(): Promise<void>;
  applyExpressionState(state: AvatarExpressionState): Promise<void>;
  clearAllExpressions(): Promise<void>;
}
