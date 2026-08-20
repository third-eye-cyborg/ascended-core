/**
 * Authorization (policy) port plus generic adapters.
 *
 * Policies are expressed abstractly over actor/action/resource so product
 * vocabularies stay out of the contract.
 */

import {
  nowIso,
  HealthState,
  type EntityId,
  type HealthCheckable,
  type HealthReport,
  type Metadata,
} from "@third-eye-cyborg/core";

/** The subject attempting an action. */
export interface PolicyActor {
  /** Opaque account identifier. */
  accountId: EntityId;
  /** Abstract role names assigned to the actor. */
  roles?: readonly string[];
  /** Redaction-safe extension point. */
  metadata?: Metadata;
}

/** The resource an action targets. */
export interface PolicyResource {
  /** Abstract resource type, e.g. "document" or "collection". */
  type: string;
  /** Opaque resource identifier, when applicable. */
  id?: EntityId;
  /** Opaque owner account, when ownership is relevant. */
  ownerId?: EntityId;
  /** Redaction-safe extension point. */
  metadata?: Metadata;
}

/** The outcome of a policy check. */
export interface PolicyDecision {
  /** Whether the action is permitted. */
  allow: boolean;
  /** Optional human-readable justification (redaction-safe). */
  reason?: string;
}

/**
 * Policy check port. Implementations decide whether an actor may perform an
 * action against a resource.
 */
export interface PolicyCheckPort {
  can(
    actor: PolicyActor,
    action: string,
    resource: PolicyResource,
  ): Promise<PolicyDecision>;
}

/** Permissive policy that allows everything. Useful in tests and local dev. */
export class AllowAllPolicy implements PolicyCheckPort, HealthCheckable {
  async can(
    _actor: PolicyActor,
    _action: string,
    _resource: PolicyResource,
  ): Promise<PolicyDecision> {
    return { allow: true };
  }

  async checkHealth(): Promise<HealthReport> {
    return { state: HealthState.HEALTHY, checkedAt: nowIso() };
  }
}

/**
 * A permission string. Convention: `"<action>:<resourceType>"` with `"*"` as
 * a wildcard for either segment (e.g. `"read:*"` or `"*:document"` or `"*"`).
 */
export type Permission = string;

/** Map of role name to the permissions granted to that role. */
export type RolePermissionMap = Record<string, readonly Permission[]>;

/**
 * Generic role-based policy. An actor is allowed when any of its roles grants
 * a matching permission for the action + resource type.
 */
export class RoleBasedPolicy implements PolicyCheckPort, HealthCheckable {
  constructor(private readonly roles: RolePermissionMap) {}

  async can(
    actor: PolicyActor,
    action: string,
    resource: PolicyResource,
  ): Promise<PolicyDecision> {
    const actorRoles = actor.roles ?? [];
    for (const role of actorRoles) {
      const permissions = this.roles[role];
      if (permissions === undefined) continue;
      for (const permission of permissions) {
        if (matches(permission, action, resource.type)) {
          return { allow: true, reason: `granted by role "${role}"` };
        }
      }
    }
    return { allow: false, reason: "no matching role permission" };
  }

  async checkHealth(): Promise<HealthReport> {
    return { state: HealthState.HEALTHY, checkedAt: nowIso() };
  }
}

function matches(
  permission: Permission,
  action: string,
  resourceType: string,
): boolean {
  if (permission === "*") return true;
  const sep = permission.indexOf(":");
  if (sep === -1) return false;
  const permAction = permission.slice(0, sep);
  const permResource = permission.slice(sep + 1);
  const actionOk = permAction === "*" || permAction === action;
  const resourceOk = permResource === "*" || permResource === resourceType;
  return actionOk && resourceOk;
}
