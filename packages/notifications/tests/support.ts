import type { DomainEvent, EventBus } from "../src/events";
import type { Clock } from "../src/workflows";
import type { NotificationRequest } from "../src/types";
import type { EmailSenderPort } from "../src/service";

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

/** Controllable clock for deterministic reminder tests. */
export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  set(date: Date): void {
    this.current = date;
  }
}

/** Email sender that always throws, to exercise failure handling. */
export class ThrowingEmailSender implements EmailSenderPort {
  async deliver(_request: NotificationRequest): Promise<void> {
    throw new Error("email transport unavailable");
  }
}
