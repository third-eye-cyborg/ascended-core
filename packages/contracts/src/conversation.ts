/**
 * Conversation bounded context: direct/group conversations, messages, and
 * delivery state.
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@third-eye-cyborg/core";
import { hasTimestamps, isEnumMember, isRecord } from "./internal/guards";

/** Whether a conversation is one-to-one or multi-party. */
export type ConversationKind = "direct" | "group";

/** A conversation between two or more participants. */
export interface Conversation {
  id: EntityId;
  kind: ConversationKind;
  participantIds: EntityId[];
  title?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Delivery lifecycle state of a message. */
export enum MessageDeliveryState {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

/** A message within a conversation. */
export interface Message {
  id: EntityId;
  conversationId: EntityId;
  senderId: EntityId;
  body: string;
  deliveryState: MessageDeliveryState;
  sentAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

const CONVERSATION_KINDS: readonly ConversationKind[] = ["direct", "group"];

/** Type guard for {@link Conversation}. */
export function isConversation(value: unknown): value is Conversation {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    typeof value["kind"] === "string" &&
    (CONVERSATION_KINDS as string[]).includes(value["kind"]) &&
    Array.isArray(value["participantIds"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link MessageDeliveryState}. */
export function isMessageDeliveryState(value: unknown): value is MessageDeliveryState {
  return isEnumMember(MessageDeliveryState, value);
}

/** Type guard for {@link Message}. */
export function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["conversationId"]) &&
    isEntityId(value["senderId"]) &&
    typeof value["body"] === "string" &&
    isMessageDeliveryState(value["deliveryState"]) &&
    typeof value["sentAt"] === "string" &&
    hasTimestamps(value)
  );
}
