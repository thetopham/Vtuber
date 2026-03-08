import { DEFAULT_STATE, type ControllerEvent, type OverlayState, type SocketEnvelope } from '@vtuber/shared';

export class StateStore {
  private state: OverlayState = { ...DEFAULT_STATE };

  getState(): OverlayState {
    return this.state;
  }

  applyEvent(event: ControllerEvent): SocketEnvelope {
    switch (event.type) {
      case 'subtitle.set':
        this.state = {
          ...this.state,
          subtitle: event.payload.subtitle,
          characterName: event.payload.characterName ?? this.state.characterName
        };
        break;
      case 'speaking.set':
        this.state = { ...this.state, speaking: event.payload.speaking };
        break;
      case 'emotion.set':
        this.state = { ...this.state, emotion: event.payload.emotion };
        break;
      case 'status.set':
        this.state = { ...this.state, status: event.payload.status };
        break;
      case 'scene.set':
        this.state = { ...this.state, scene: event.payload.scene };
        break;
    }

    return event;
  }

  makeSnapshot(timestamp = new Date().toISOString()): SocketEnvelope {
    return { type: 'state.snapshot', payload: this.state, timestamp };
  }
}
