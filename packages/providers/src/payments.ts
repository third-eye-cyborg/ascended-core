/**
 * Billing port — CONTRACT ONLY plus a stub adapter for tests and examples.
 *
 * This file intentionally contains NO real billing logic: no vendor SDKs, no
 * webhook signature verification, no pricing, no proration. The stub adapter
 * grants a single synthetic entitlement so downstream code can be exercised.
 */

import {
  createId,
  nowIso,
  HealthState,
  type EntityId,
  type IsoTimestamp,
  type HealthCheckable,
  type HealthReport,
  type Metadata,
} from "@ascended/core";

/** A capability an account is entitled to. */
export interface Entitlement {
  /** Abstract entitlement key, e.g. "supporter". */
  key: string;
  /** Whether the entitlement is currently active. */
  active: boolean;
  /** Optional expiry; omitted means it does not expire. */
  expiresAt?: IsoTimestamp;
  /** Redaction-safe extension point. */
  metadata?: Metadata;
}

/** Request to begin a checkout flow. */
export interface CreateCheckoutSessionInput {
  /** Account the checkout is for. */
  accountId: EntityId;
  /** Abstract plan/price identifier. */
  planId: string;
  /** URL to return to on success (synthetic in examples). */
  successUrl: string;
  /** URL to return to on cancellation (synthetic in examples). */
  cancelUrl: string;
}

/** Handle to a started checkout flow. */
export interface CheckoutSession {
  /** Opaque checkout identifier. */
  sessionId: EntityId;
  /** URL the client is redirected to (synthetic in the stub). */
  url: string;
}

/** Opaque, vendor-neutral webhook event envelope. */
export interface BillingWebhookEvent {
  /** Abstract event type, e.g. "entitlement.updated". */
  type: string;
  /** Redaction-safe event payload. */
  payload: Metadata;
}

/**
 * Billing port. `handleWebhook` is optional because not every deployment
 * receives provider callbacks. Implementations MUST NOT leak vendor details
 * through this contract.
 */
export interface BillingPort {
  /** Resolve the entitlements currently granted to an account. */
  getEntitlements(accountId: EntityId): Promise<Entitlement[]>;
  /** Begin a checkout flow for a plan. */
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession>;
  /** Optionally process an inbound webhook event. */
  handleWebhook?(event: BillingWebhookEvent): Promise<void>;
}

/**
 * Stub {@link BillingPort} adapter. Grants a fixed synthetic "supporter"
 * entitlement to every account and returns a synthetic checkout URL. Contains
 * no real billing behavior whatsoever.
 */
export class StubBillingAdapter implements BillingPort, HealthCheckable {
  async getEntitlements(_accountId: EntityId): Promise<Entitlement[]> {
    return [{ key: "supporter", active: true }];
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession> {
    const sessionId = createId("chk");
    return {
      sessionId,
      url: `memory://checkout/${encodeURIComponent(input.planId)}/${sessionId}`,
    };
  }

  async checkHealth(): Promise<HealthReport> {
    return { state: HealthState.HEALTHY, checkedAt: nowIso() };
  }
}
