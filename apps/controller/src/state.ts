import { DEFAULT_OVERLAY_STATE } from '@vtuber/shared';
import type { OverlayState } from '@vtuber/shared';

export class StateStore {
  private state: OverlayState = { ...DEFAULT_OVERLAY_STATE };

  getState(): OverlayState {
    return this.state;
  }

  patch(update: Partial<OverlayState>): OverlayState {
    this.state = {
      ...this.state,
      ...update,
    };

    return this.state;
  }
}
