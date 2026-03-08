import type { ControllerEventMap, ControllerEventType } from '@vtuber/shared';

type Listener<T extends ControllerEventType> = (payload: ControllerEventMap[T]) => void;

export class EventBus {
  private listeners = new Map<ControllerEventType, Set<Listener<ControllerEventType>>>();

  on<T extends ControllerEventType>(eventType: T, listener: Listener<T>): () => void {
    const set = this.listeners.get(eventType) ?? new Set();
    set.add(listener as Listener<ControllerEventType>);
    this.listeners.set(eventType, set);

    return () => {
      set.delete(listener as Listener<ControllerEventType>);
    };
  }

  emit<T extends ControllerEventType>(eventType: T, payload: ControllerEventMap[T]): void {
    const set = this.listeners.get(eventType);
    if (!set) return;

    for (const listener of set) {
      listener(payload);
    }
  }
}
