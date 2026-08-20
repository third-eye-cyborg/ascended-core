/**
 * Capability matrix helpers.
 *
 * Provides a deterministic baseline capability lookup keyed by generic
 * (domain, family, platform) plus a helper to fold provider health into a
 * capability. There are no vendor families here — only generic ones.
 */

import { HealthState } from "@third-eye-cyborg/core";
import type { IsoTimestamp } from "@third-eye-cyborg/core";
import { Platform } from "@third-eye-cyborg/privacy";

import type { CapabilityDescriptor, ProviderFamily } from "./providers";

/** Routed provider domains. */
export type ProviderDomain =
  | "text"
  | "image"
  | "3d"
  | "ai-recommendation"
  | "human-recommendation";

/**
 * Descriptor combining a query key with its resolved capability. Useful for
 * planning/observability tools.
 */
export interface CapabilityDescriptorEntry {
  domain: ProviderDomain;
  family: ProviderFamily;
  platform: Platform;
  capability: CapabilityDescriptor;
}

export interface CapabilityQuery {
  domain: ProviderDomain;
  family: ProviderFamily;
  platform: Platform;
}

/** Provider readiness state, mirroring core {@link HealthState}. */
export enum ProviderState {
  AVAILABLE = "available",
  DEGRADED = "degraded",
  UNAVAILABLE = "unavailable",
}

/** A point-in-time health reading for a named provider. */
export interface ProviderHealthSnapshot {
  providerName: string;
  state: ProviderState;
  checkedAt: IsoTimestamp;
  reason?: string;
}

const unavailable = (reason: string): CapabilityDescriptor => ({
  available: false,
  unavailableReason: reason,
});

const available = (
  extras: Omit<CapabilityDescriptor, "available"> = {},
): CapabilityDescriptor => ({
  available: true,
  ...extras,
});

function localTextCapability(platform: Platform): CapabilityDescriptor {
  switch (platform) {
    case Platform.LINUX:
    case Platform.MACOS:
    case Platform.DESKTOP:
      return available({
        estimatedLatencyMs: 900,
        requiresExplicitInstall: true,
      });
    case Platform.WINDOWS:
      return available({
        estimatedLatencyMs: 1100,
        requiresExplicitInstall: true,
      });
    case Platform.WEB:
      return available({
        estimatedLatencyMs: 1500,
        requiresExplicitInstall: true,
      });
    case Platform.IOS:
    case Platform.ANDROID:
      return unavailable(
        "Local text inference is not enabled on this mobile platform",
      );
    default:
      return unavailable("Unsupported platform for local text inference");
  }
}

function localImageCapability(platform: Platform): CapabilityDescriptor {
  switch (platform) {
    case Platform.LINUX:
    case Platform.DESKTOP:
      return available({
        estimatedLatencyMs: 2500,
        requiresExplicitInstall: true,
      });
    case Platform.MACOS:
      return available({
        estimatedLatencyMs: 2200,
        requiresExplicitInstall: true,
      });
    default:
      return unavailable("Local image generation unavailable on this platform");
  }
}

function local3DCapability(platform: Platform): CapabilityDescriptor {
  switch (platform) {
    case Platform.LINUX:
    case Platform.DESKTOP:
      return available({
        estimatedLatencyMs: 4000,
        requiresExplicitInstall: true,
      });
    case Platform.MACOS:
      return available({
        estimatedLatencyMs: 4500,
        requiresExplicitInstall: true,
      });
    default:
      return unavailable("Local 3D generation unavailable on this platform");
  }
}

/**
 * Deterministic baseline capability lookup. Dynamic checks (installed models,
 * VRAM, battery constraints) should extend this in adapters.
 */
export function getBaselineCapability(
  query: CapabilityQuery,
): CapabilityDescriptor {
  const { domain, family, platform } = query;

  if (family === "human") {
    return available({ estimatedLatencyMs: 120 });
  }

  if (
    family === "cloud-text" ||
    family === "cloud-image" ||
    family === "cloud-3d" ||
    family === "remote-inference" ||
    family === "embeddings"
  ) {
    return available({ estimatedLatencyMs: 600 });
  }

  if (family === "local") {
    switch (domain) {
      case "text":
        return localTextCapability(platform);
      case "image":
        return localImageCapability(platform);
      case "3d":
        return local3DCapability(platform);
      case "ai-recommendation":
        return unavailable("Local recommendation ranking is not implemented");
      case "human-recommendation":
        return unavailable("Human recommendation cannot use the local family");
      default:
        return unavailable("No baseline rule for this domain");
    }
  }

  return unavailable("No baseline capability rule found for this query");
}

/**
 * Fold a health snapshot into a baseline capability. Unavailable/degraded
 * health downgrades an otherwise-available capability.
 */
export function applyHealthToCapability(
  capability: CapabilityDescriptor,
  health: ProviderHealthSnapshot | undefined,
): CapabilityDescriptor {
  if (!capability.available || !health) {
    return capability;
  }

  if (health.state === ProviderState.AVAILABLE) {
    return capability;
  }

  if (health.state === ProviderState.DEGRADED) {
    return {
      ...capability,
      unavailableReason:
        health.reason ?? "Provider is degraded (higher latency or lower quality)",
    };
  }

  return {
    ...capability,
    available: false,
    unavailableReason: health.reason ?? "Provider currently unavailable",
  };
}

/** Map a core {@link HealthState} to a {@link ProviderState}. */
export function providerStateFromHealth(state: HealthState): ProviderState {
  switch (state) {
    case HealthState.HEALTHY:
      return ProviderState.AVAILABLE;
    case HealthState.DEGRADED:
      return ProviderState.DEGRADED;
    case HealthState.UNHEALTHY:
      return ProviderState.UNAVAILABLE;
    default: {
      const _never: never = state;
      return _never;
    }
  }
}
