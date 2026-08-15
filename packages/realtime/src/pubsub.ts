/**
 * Pub/sub contracts. Topics are exact strings — wildcard/glob matching is
 * intentionally out of scope so that fan-out semantics stay predictable and
 * adapter-portable.
 */

/** Function invoked for each message published to a subscribed topic. */
export type MessageHandler<TMessage = unknown> = (
  message: TMessage,
  topic: string,
) => void | Promise<void>;

/** Disposes a subscription. Idempotent. */
export type Unsubscribe = () => void;

/**
 * Port for topic-based publish/subscribe with exact (non-wildcard) topics.
 */
export interface PubSubPort {
  /** Publish a message to all handlers subscribed to the exact topic. */
  publish<TMessage = unknown>(topic: string, message: TMessage): Promise<void>;
  /**
   * Subscribe a handler to an exact topic.
   * @returns an idempotent unsubscribe function.
   */
  subscribe<TMessage = unknown>(topic: string, handler: MessageHandler<TMessage>): Unsubscribe;
}
