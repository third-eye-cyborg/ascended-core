/**
 * In-memory {@link PubSubPort} with exact-topic fan-out.
 */

import type { MessageHandler, PubSubPort, Unsubscribe } from "../pubsub";

/** In-memory pub/sub with synchronous handler registration. */
export class LocalPubSub implements PubSubPort {
  private readonly topics = new Map<string, Set<MessageHandler>>();

  async publish<TMessage = unknown>(topic: string, message: TMessage): Promise<void> {
    const handlers = this.topics.get(topic);
    if (!handlers) return;
    // Snapshot so handlers unsubscribing mid-fan-out do not skip peers.
    for (const handler of [...handlers]) {
      await handler(message, topic);
    }
  }

  subscribe<TMessage = unknown>(topic: string, handler: MessageHandler<TMessage>): Unsubscribe {
    const typed = handler as MessageHandler;
    let handlers = this.topics.get(topic);
    if (!handlers) {
      handlers = new Set();
      this.topics.set(topic, handlers);
    }
    handlers.add(typed);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const set = this.topics.get(topic);
      if (!set) return;
      set.delete(typed);
      if (set.size === 0) this.topics.delete(topic);
    };
  }
}
