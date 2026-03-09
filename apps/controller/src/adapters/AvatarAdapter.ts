import type { AvatarExpressionState } from "@vtuber/shared";

export type AvatarAdapterStatus = {
  connected: boolean;
  authenticated: boolean;
  activeExpressions: string[];
};

export interface AvatarAdapter {
  connect(): Promise<void>;
  getStatus(): AvatarAdapterStatus;
  resetToDefault(): Promise<void>;
  applyExpressionState(state: AvatarExpressionState): Promise<void>;
  clearAllExpressions(): Promise<void>;
}
