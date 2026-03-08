import { defaultOverlayState, type OverlayState } from "@vtuber/shared";

export function createInitialState(): OverlayState {
  return { ...defaultOverlayState };
}

export function patchState(
  previous: OverlayState,
  updates: Partial<OverlayState>
): OverlayState {
  return {
    ...previous,
    ...updates
  };
}
