import { nowIso } from "@third-eye-cyborg/core";
import { Platform } from "@third-eye-cyborg/privacy";
import { describe, it, expect } from "vitest";

import {
  applyHealthToCapability,
  DefaultProviderRegistry,
  getBaselineCapability,
  LocalEchoTextProvider,
  ProviderState,
} from "../src/index";

describe("getBaselineCapability", () => {
  it("marks cloud families available with a latency estimate", () => {
    const cap = getBaselineCapability({
      domain: "text",
      family: "cloud-text",
      platform: Platform.WEB,
    });
    expect(cap.available).toBe(true);
    expect(cap.estimatedLatencyMs).toBeGreaterThan(0);
  });

  it("marks local text unavailable on mobile", () => {
    const cap = getBaselineCapability({
      domain: "text",
      family: "local",
      platform: Platform.IOS,
    });
    expect(cap.available).toBe(false);
  });

  it("marks local text available on desktop with install required", () => {
    const cap = getBaselineCapability({
      domain: "text",
      family: "local",
      platform: Platform.DESKTOP,
    });
    expect(cap.available).toBe(true);
    expect(cap.requiresExplicitInstall).toBe(true);
  });
});

describe("applyHealthToCapability", () => {
  it("downgrades an available capability when unavailable", () => {
    const base = getBaselineCapability({
      domain: "text",
      family: "cloud-text",
      platform: Platform.WEB,
    });
    const out = applyHealthToCapability(base, {
      providerName: "example-text-provider",
      state: ProviderState.UNAVAILABLE,
      checkedAt: nowIso(),
    });
    expect(out.available).toBe(false);
  });

  it("keeps availability but annotates degraded state", () => {
    const base = getBaselineCapability({
      domain: "text",
      family: "cloud-text",
      platform: Platform.WEB,
    });
    const out = applyHealthToCapability(base, {
      providerName: "example-text-provider",
      state: ProviderState.DEGRADED,
      checkedAt: nowIso(),
      reason: "slow",
    });
    expect(out.available).toBe(true);
    expect(out.unavailableReason).toBe("slow");
  });
});

describe("DefaultProviderRegistry", () => {
  it("uses name-based replace semantics", () => {
    const registry = new DefaultProviderRegistry();
    registry.registerTextProvider(new LocalEchoTextProvider());
    registry.registerTextProvider(new LocalEchoTextProvider());
    expect(registry.getTextProviders()).toHaveLength(1);
  });
});
