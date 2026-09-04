/**
 * Events bounded context: scheduled community events, RSVPs, and live
 * sessions. (Distinct from the domain-event bus in `@third-eye-cyborg/events`.)
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@third-eye-cyborg/core";
import { hasTimestamps, isEnumMember, isRecord } from "./internal/guards";

/** Scheduling shape of a community event. */
export enum EventKind {
  SINGLE = "single",
  RECURRING = "recurring",
  PRIVATE = "private",
}

/** A scheduled community event. */
export interface CommunityEvent {
  id: EntityId;
  communityId: EntityId;
  title: string;
  kind: EventKind;
  startsAt: IsoTimestamp;
  endsAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** RSVP response status for an event. */
export enum RsvpStatus {
  GOING = "going",
  MAYBE = "maybe",
  DECLINED = "declined",
}

/** An account's RSVP to a community event. */
export interface Rsvp {
  id: EntityId;
  eventId: EntityId;
  accountId: EntityId;
  status: RsvpStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** A live session associated with a community event. */
export interface LiveSession {
  id: EntityId;
  eventId: EntityId;
  startedAt?: IsoTimestamp;
  endedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Type guard for {@link EventKind}. */
export function isEventKind(value: unknown): value is EventKind {
  return isEnumMember(EventKind, value);
}

/** Type guard for {@link CommunityEvent}. */
export function isCommunityEvent(value: unknown): value is CommunityEvent {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["communityId"]) &&
    typeof value["title"] === "string" &&
    isEventKind(value["kind"]) &&
    typeof value["startsAt"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link RsvpStatus}. */
export function isRsvpStatus(value: unknown): value is RsvpStatus {
  return isEnumMember(RsvpStatus, value);
}

/** Type guard for {@link Rsvp}. */
export function isRsvp(value: unknown): value is Rsvp {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["eventId"]) &&
    isEntityId(value["accountId"]) &&
    isRsvpStatus(value["status"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link LiveSession}. */
export function isLiveSession(value: unknown): value is LiveSession {
  if (!isRecord(value)) return false;
  return isEntityId(value["id"]) && isEntityId(value["eventId"]) && hasTimestamps(value);
}
