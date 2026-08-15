import type { DomainEvent, EventBus } from "../src/events";
import type { Clock } from "../src/presence";

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

/** Controllable clock for deterministic TTL tests. */
export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
