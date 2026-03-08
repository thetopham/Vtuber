import { EventEmitter } from 'node:events';
import type { ControllerEvent, EventType } from '@vtuber/shared';

export class EventBus {
  private emitter = new EventEmitter();

  emit(event: ControllerEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on<T extends EventType>(type: T, listener: (event: Extract<ControllerEvent, { type: T }>) => void): () => void {
    this.emitter.on(type, listener as (event: ControllerEvent) => void);
    return () => this.emitter.off(type, listener as (event: ControllerEvent) => void);
  }

  onAny(listener: (event: ControllerEvent) => void): () => void {
    this.emitter.on('*', listener);
    return () => this.emitter.off('*', listener);
  }
}
