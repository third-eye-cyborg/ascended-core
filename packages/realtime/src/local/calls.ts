/**
 * In-memory {@link CallSessionPort}. Pure bookkeeping — no transport.
 */

import { CoreError, ErrorCode, createId, nowIso } from "@ascended/core";
import type { EntityId } from "@ascended/core";
import type { EventBus } from "../events";
import type {
  CallParticipant,
  CallSession,
  CallSessionPort,
  CreateCallSessionOptions,
  MediaState,
} from "../calls";
import { CallSessionState, defaultMediaState } from "../calls";

/** In-memory call-session bookkeeping. */
export class LocalCallSessions implements CallSessionPort {
  private readonly sessions = new Map<EntityId, CallSession>();

  constructor(private readonly bus: EventBus) {}

  async createSession(options?: CreateCallSessionOptions): Promise<CallSession> {
    const id = options?.id ?? createId("call");
    if (this.sessions.has(id)) {
      throw new CoreError({ code: ErrorCode.CONFLICT, message: `Session ${id} already exists.` });
    }
    const session: CallSession = {
      id,
      state: CallSessionState.CREATED,
      createdAt: nowIso(),
      participants: [],
      ...(options?.roomId ? { roomId: options.roomId } : {}),
      ...(options?.metadata ? { metadata: options.metadata } : {}),
    };
    this.sessions.set(id, session);
    await this.emit("realtime.call_created", { sessionId: id });
    return session;
  }

  async addParticipant(
    sessionId: EntityId,
    accountId: EntityId,
    media?: Partial<MediaState>,
  ): Promise<CallSession> {
    const session = this.requireActiveOrCreated(sessionId);
    if (session.participants.some((p) => p.accountId === accountId)) {
      throw new CoreError({
        code: ErrorCode.CONFLICT,
        message: `Account ${accountId} already in session ${sessionId}.`,
      });
    }
    const participant: CallParticipant = {
      accountId,
      joinedAt: nowIso(),
      media: { ...defaultMediaState(), ...media },
    };
    const updated: CallSession = {
      ...session,
      state: CallSessionState.ACTIVE,
      participants: [...session.participants, participant],
    };
    this.sessions.set(sessionId, updated);
    await this.emit("realtime.call_participant_added", { sessionId, accountId });
    return updated;
  }

  async removeParticipant(sessionId: EntityId, accountId: EntityId): Promise<CallSession> {
    const session = this.require(sessionId);
    const updated: CallSession = {
      ...session,
      participants: session.participants.filter((p) => p.accountId !== accountId),
    };
    this.sessions.set(sessionId, updated);
    await this.emit("realtime.call_participant_removed", { sessionId, accountId });
    return updated;
  }

  async updateMediaState(
    sessionId: EntityId,
    accountId: EntityId,
    media: Partial<MediaState>,
  ): Promise<CallSession> {
    const session = this.require(sessionId);
    const idx = session.participants.findIndex((p) => p.accountId === accountId);
    if (idx === -1) {
      throw new CoreError({
        code: ErrorCode.NOT_FOUND,
        message: `Account ${accountId} not in session ${sessionId}.`,
      });
    }
    const current = session.participants[idx];
    // Guaranteed present by the index check above.
    if (!current) {
      throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `Participant missing.` });
    }
    const participants = [...session.participants];
    participants[idx] = { ...current, media: { ...current.media, ...media } };
    const updated: CallSession = { ...session, participants };
    this.sessions.set(sessionId, updated);
    await this.emit("realtime.call_media_updated", { sessionId, accountId });
    return updated;
  }

  async endSession(sessionId: EntityId): Promise<CallSession> {
    const session = this.require(sessionId);
    const updated: CallSession = {
      ...session,
      state: CallSessionState.ENDED,
      endedAt: nowIso(),
    };
    this.sessions.set(sessionId, updated);
    await this.emit("realtime.call_ended", { sessionId });
    return updated;
  }

  private require(sessionId: EntityId): CallSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `Session ${sessionId} not found.` });
    }
    return session;
  }

  private requireActiveOrCreated(sessionId: EntityId): CallSession {
    const session = this.require(sessionId);
    if (session.state === CallSessionState.ENDED) {
      throw new CoreError({
        code: ErrorCode.CONFLICT,
        message: `Session ${sessionId} has ended.`,
      });
    }
    return session;
  }

  private async emit(type: string, payload: Record<string, unknown>): Promise<void> {
    await this.bus.publish({ id: createId("evt"), type, occurredAt: nowIso(), payload });
  }
}
