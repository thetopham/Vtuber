import { EventEmitter } from "node:events";
import type { ControllerEvent } from "@vtuber/shared";

export class EventBus {
  private emitter = new EventEmitter();

  publish(event: ControllerEvent): void {
    this.emitter.emit("controller-event", event);
  }

  subscribe(listener: (event: ControllerEvent) => void): () => void {
    this.emitter.on("controller-event", listener);
    return () => this.emitter.off("controller-event", listener);
  }
}
