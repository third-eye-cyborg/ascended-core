/**
 * Authentication provider ports plus a generic in-memory adapter.
 *
 * These contracts are vendor-neutral: no real identity provider is referenced.
 * The in-memory adapter exists only for tests and examples.
 */

import {
  createId,
  nowIso,
  toIsoTimestamp,
  parseIsoTimestamp,
  HealthState,
  type EntityId,
  type IsoTimestamp,
  type HealthCheckable,
  type HealthReport,
  type Metadata,
} from "@third-eye-cyborg/core";

/** An authenticated session resolved from an opaque bearer token. */
export interface AuthSession {
  /** Opaque session identifier. */
  sessionId: EntityId;
  /** Opaque account identifier the session belongs to. */
  accountId: EntityId;
  /** When the session was issued. */
  issuedAt: IsoTimestamp;
  /** When the session expires. */
  expiresAt: IsoTimestamp;
  /** Redaction-safe extension point (roles, scopes, product tags). */
  metadata?: Metadata;
}

/** A newly issued session together with its opaque bearer token. */
export interface IssuedSession {
  /** Opaque bearer token clients present on subsequent requests. */
  token: string;
  /** The resolved session record. */
  session: AuthSession;
}

/**
 * Persistence port for sessions. Adapters back this with a database, cache,
 * or (for tests) an in-memory map.
 */
export interface SessionStore {
  /** Persist an issued session keyed by its opaque token. */
  save(token: string, session: AuthSession): Promise<void>;
  /** Resolve a session by token, or `null` when absent. */
  load(token: string): Promise<AuthSession | null>;
  /** Remove a session by token. */
  remove(token: string): Promise<void>;
}

/**
 * Authentication provider port. Implementations verify presented tokens and
 * issue new sessions for accounts.
 */
export interface AuthProvider {
  /** Resolve a session from a bearer token, or `null` when invalid/expired. */
  verifySession(token: string): Promise<AuthSession | null>;
  /** Issue a new session for an account. */
  issueSession(accountId: EntityId): Promise<IssuedSession>;
}

/** In-memory {@link SessionStore} for tests and examples. */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, AuthSession>();

  async save(token: string, session: AuthSession): Promise<void> {
    this.sessions.set(token, session);
  }

  async load(token: string): Promise<AuthSession | null> {
    return this.sessions.get(token) ?? null;
  }

  async remove(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}

/** Options controlling {@link InMemoryAuthProvider} behavior. */
export interface InMemoryAuthProviderOptions {
  /** Session lifetime in milliseconds. Defaults to one hour. */
  sessionTtlMs?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
  /** Backing store. Defaults to a fresh {@link InMemorySessionStore}. */
  store?: SessionStore;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * In-memory {@link AuthProvider} for tests and examples. Tokens are opaque
 * random ids; sessions expire based on an injectable clock.
 */
export class InMemoryAuthProvider implements AuthProvider, HealthCheckable {
  private readonly store: SessionStore;
  private readonly ttlMs: number;
  private readonly now: () => Date;

  constructor(options: InMemoryAuthProviderOptions = {}) {
    this.store = options.store ?? new InMemorySessionStore();
    this.ttlMs = options.sessionTtlMs ?? ONE_HOUR_MS;
    this.now = options.now ?? (() => new Date());
  }

  async verifySession(token: string): Promise<AuthSession | null> {
    const session = await this.store.load(token);
    if (session === null) return null;
    const expires = parseIsoTimestamp(session.expiresAt).getTime();
    if (this.now().getTime() >= expires) {
      await this.store.remove(token);
      return null;
    }
    return session;
  }

  async issueSession(accountId: EntityId): Promise<IssuedSession> {
    const issuedAtDate = this.now();
    const session: AuthSession = {
      sessionId: createId("sess"),
      accountId,
      issuedAt: toIsoTimestamp(issuedAtDate),
      expiresAt: toIsoTimestamp(new Date(issuedAtDate.getTime() + this.ttlMs)),
    };
    const token = createId("tok");
    await this.store.save(token, session);
    return { token, session };
  }

  async checkHealth(): Promise<HealthReport> {
    return { state: HealthState.HEALTHY, checkedAt: nowIso() };
  }
}
