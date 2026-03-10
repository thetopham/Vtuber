import { defaultOverlayState, type OverlayState } from "@vtuber/shared";

export function createInitialState(): OverlayState {
  return { ...defaultOverlayState };
}
