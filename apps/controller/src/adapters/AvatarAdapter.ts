import type { AvatarAdapterStatus, AvatarExpressionState } from "@vtuber/shared";

export interface AvatarAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): AvatarAdapterStatus;
  resetToDefault(): Promise<void>;
  applyExpressionState(state: AvatarExpressionState): Promise<void>;
  clearAllExpressions(): Promise<void>;
}
