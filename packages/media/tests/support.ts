import type { DomainEvent, EventBus } from "../src/events";

/** Test bus that records every published event. */
export class RecordingEventBus implements EventBus {
  readonly events: DomainEvent[] = [];
  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }
  types(): string[] {
    return this.events.map((e) => e.type);
  }
}
