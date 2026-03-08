import { EventEmitter } from "node:events";
import type { EventName, EventPayloadMap } from "@vtuber/shared";

export class EventBus {
  private readonly emitter = new EventEmitter();

  emit<T extends EventName>(type: T, payload: EventPayloadMap[T]): void {
    this.emitter.emit(type, payload);
  }

  on<T extends EventName>(type: T, listener: (payload: EventPayloadMap[T]) => void): void {
    this.emitter.on(type, listener);
  }
}
