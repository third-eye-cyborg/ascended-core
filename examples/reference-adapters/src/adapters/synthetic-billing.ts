/**
 * A synthetic {@link BillingPort} implementation.
 *
 * Demonstrates the billing port end-to-end without any payment vendor:
 * entitlements live in memory, checkout sessions redirect to example.org, and
 * a synthetic webhook grants the entitlement a checkout was opened for.
 */

import { createId, type EntityId } from "@third-eye-cyborg/core";
import type {
  BillingPort,
  BillingWebhookEvent,
  CheckoutSession,
  CreateCheckoutSessionInput,
  Entitlement,
} from "@third-eye-cyborg/providers";

/** Synthetic checkout base URL (reserved documentation domain). */
export const SYNTHETIC_CHECKOUT_BASE_URL = "https://checkout.example.org";

export class SyntheticBillingAdapter implements BillingPort {
  private readonly entitlements = new Map<string, Entitlement[]>();

  /** Sessions opened via {@link createCheckoutSession}, in order. */
  get sessions(): readonly CheckoutSession[] {
    return [...this.openedSessions];
  }

  private readonly openedSessions: CheckoutSession[] = [];

  async getEntitlements(accountId: EntityId): Promise<Entitlement[]> {
    return [...(this.entitlements.get(accountId) ?? [])];
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession> {
    const session: CheckoutSession = {
      sessionId: createId("chk"),
      url: `${SYNTHETIC_CHECKOUT_BASE_URL}/${encodeURIComponent(input.planId)}`,
    };
    this.openedSessions.push(session);
    // A real adapter would wait for the vendor webhook; the synthetic adapter
    // grants the entitlement immediately so demos complete offline.
    this.grant(input.accountId, input.planId);
    return session;
  }

  /**
   * Accepts synthetic events of type `entitlement.updated` with payload
   * `{ accountId, key, active }`. Unknown types are ignored.
   */
  async handleWebhook(event: BillingWebhookEvent): Promise<void> {
    if (event.type !== "entitlement.updated") return;
    const { accountId, key, active } = event.payload;
    if (typeof accountId !== "string" || typeof key !== "string") return;
    const id = accountId as EntityId;
    if (active === false) {
      this.entitlements.set(
        id,
        (this.entitlements.get(id) ?? []).filter((e) => e.key !== key),
      );
      return;
    }
    this.grant(id, key);
  }

  private grant(accountId: EntityId, key: string): void {
    const current = this.entitlements.get(accountId) ?? [];
    if (!current.some((e) => e.key === key)) {
      current.push({ key, active: true });
    }
    this.entitlements.set(accountId, current);
  }
}
