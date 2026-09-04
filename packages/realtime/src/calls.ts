/**
 * Call/session bookkeeping contracts. These describe *negotiation state only*
 * — there is deliberately no WebRTC, SFU, or vendor signaling here. Transport
 * adapters live outside this open-source core.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@third-eye-cyborg/core";

/** Lifecycle state of a call session. */
export enum CallSessionState {
  CREATED = "created",
  ACTIVE = "active",
  ENDED = "ended",
}

/** Direction/enablement of a single media track for a participant. */
export interface MediaState {
  /** Whether the participant is sending audio. */
  audioEnabled: boolean;
  /** Whether the participant is sending video. */
  videoEnabled: boolean;
  /** Whether the participant is sharing a screen. */
  screenSharing: boolean;
}

/** A participant within a call session. */
export interface CallParticipant {
  /** Account taking part in the call. */
  accountId: EntityId;
  /** When the participant was added. */
  joinedAt: IsoTimestamp;
  /** Current media enablement state. */
  media: MediaState;
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/** A call session and its participants. */
export interface CallSession {
  /** Opaque session id, e.g. `call_…`. */
  id: EntityId;
  /** Room this session is bound to, when applicable. */
  roomId?: EntityId;
  /** Current lifecycle state. */
  state: CallSessionState;
  /** When the session was created. */
  createdAt: IsoTimestamp;
  /** When the session ended, when it has. */
  endedAt?: IsoTimestamp;
  /** Current participants keyed by account id. */
  participants: CallParticipant[];
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/** Options accepted when creating a call session. */
export interface CreateCallSessionOptions {
  /** Optional caller-supplied id; generated when omitted. */
  id?: EntityId;
  /** Optional room binding. */
  roomId?: EntityId;
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/** Default media state (all tracks disabled). */
export function defaultMediaState(): MediaState {
  return { audioEnabled: false, videoEnabled: false, screenSharing: false };
}

/**
 * Port for pure call-session bookkeeping. No transport concerns: adapters map
 * this state onto their signaling layer of choice.
 */
export interface CallSessionPort {
  /** Create a new session in the {@link CallSessionState.CREATED} state. */
  createSession(options?: CreateCallSessionOptions): Promise<CallSession>;
  /** Add a participant, transitioning the session to `active`. */
  addParticipant(
    sessionId: EntityId,
    accountId: EntityId,
    media?: Partial<MediaState>,
  ): Promise<CallSession>;
  /** Remove a participant from the session. */
  removeParticipant(sessionId: EntityId, accountId: EntityId): Promise<CallSession>;
  /** Update the media enablement state of a participant. */
  updateMediaState(
    sessionId: EntityId,
    accountId: EntityId,
    media: Partial<MediaState>,
  ): Promise<CallSession>;
  /** End the session, transitioning it to `ended`. */
  endSession(sessionId: EntityId): Promise<CallSession>;
}
