import { ErrorCode } from "@third-eye-cyborg/core";
import { describe, it, expect } from "vitest";

import {
  createRequestContext,
  defaultPolicyForMode,
  Platform,
  PrivacyBlockedError,
  PrivacyMode,
  PrivacyPolicyEnforcer,
  ProviderFamilies,
} from "../src/index";

function ctx(mode: PrivacyMode) {
  return createRequestContext({
    feature: "recommendation",
    platform: Platform.WEB,
    privacyMode: mode,
    userId: "user_example",
  });
}

describe("PrivacyPolicyEnforcer", () => {
  it("human mode blocks every automated family", () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.HUMAN),
    );
    const context = ctx(PrivacyMode.HUMAN);

    for (const family of [
      ProviderFamilies.LOCAL,
      ProviderFamilies.CLOUD_TEXT,
      ProviderFamilies.CLOUD_IMAGE,
      ProviderFamilies.CLOUD_3D,
      ProviderFamilies.EMBEDDINGS,
      ProviderFamilies.REMOTE_INFERENCE,
    ]) {
      expect(() =>
        enforcer.validateProviderCall("some-provider", family, context),
      ).toThrow(PrivacyBlockedError);
    }
  });

  it("human mode allows the human family", () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.HUMAN),
    );
    expect(() =>
      enforcer.validateProviderCall(
        "community-ranker",
        ProviderFamilies.HUMAN,
        ctx(PrivacyMode.HUMAN),
      ),
    ).not.toThrow();
  });

  it("private-local blocks cloud families but allows local", () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL),
    );
    const context = ctx(PrivacyMode.PRIVATE_LOCAL);

    expect(() =>
      enforcer.validateProviderCall(
        "example-text-provider",
        ProviderFamilies.CLOUD_TEXT,
        context,
      ),
    ).toThrow(PrivacyBlockedError);

    expect(() =>
      enforcer.validateProviderCall(
        "local-echo",
        ProviderFamilies.LOCAL,
        context,
      ),
    ).not.toThrow();
  });

  it("private-local allows an explicitly allow-listed provider even if family blocked", () => {
    const policy = defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL);
    policy.allowedCloudProviders = ["example-text-provider"];
    const enforcer = new PrivacyPolicyEnforcer(policy);

    expect(() =>
      enforcer.validateProviderCall(
        "example-text-provider",
        ProviderFamilies.CLOUD_TEXT,
        ctx(PrivacyMode.PRIVATE_LOCAL),
      ),
    ).not.toThrow();
  });

  it("cloud mode allows all families", () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    const context = ctx(PrivacyMode.CLOUD);
    for (const family of [
      ProviderFamilies.CLOUD_TEXT,
      ProviderFamilies.CLOUD_IMAGE,
      ProviderFamilies.CLOUD_3D,
      ProviderFamilies.EMBEDDINGS,
      ProviderFamilies.LOCAL,
    ]) {
      expect(() =>
        enforcer.validateProviderCall("provider", family, context),
      ).not.toThrow();
    }
  });

  it("blocked error carries a user-safe message and telemetry payload", () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL),
    );
    try {
      enforcer.validateProviderCall(
        "example-image-provider",
        ProviderFamilies.CLOUD_IMAGE,
        ctx(PrivacyMode.PRIVATE_LOCAL),
      );
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(PrivacyBlockedError.isPrivacyBlockedError(error)).toBe(true);
      const blocked = error as PrivacyBlockedError;
      expect(blocked.code).toBe(ErrorCode.PRIVACY_BLOCKED);
      expect(blocked.message.length).toBeGreaterThan(0);
      expect(blocked.blockedCall.attemptedFamily).toBe(
        ProviderFamilies.CLOUD_IMAGE,
      );
      expect(blocked.blockedCall.eventType).toBe("blocked");
    }
  });

  it("uses family-based logic, not vendor substrings", () => {
    // A provider name that contains a would-be vendor substring is NOT blocked
    // when its declared family is allowed.
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL),
    );
    expect(() =>
      enforcer.validateProviderCall(
        "local-remote-inference-lookalike",
        ProviderFamilies.LOCAL,
        ctx(PrivacyMode.PRIVATE_LOCAL),
      ),
    ).not.toThrow();
  });
});
