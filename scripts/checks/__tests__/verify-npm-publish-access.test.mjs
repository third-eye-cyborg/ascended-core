import { describe, expect, it } from "vitest";

import {
  isConfiguredToken,
  matchingConfiguredTokens,
  uniquelyConfiguredToken,
} from "../verify-npm-publish-access.mjs";

const configuredToken = "npm_releaseCredential123456";

describe("isConfiguredToken", () => {
  it("accepts the exact credential when npm returns it", () => {
    expect(isConfiguredToken({ token: configuredToken }, configuredToken)).toBe(
      true,
    );
  });

  it("accepts npm's prefix/suffix masked token metadata", () => {
    expect(
      isConfiguredToken(
        { token: "npm_release...123456" },
        configuredToken,
      ),
    ).toBe(true);
  });

  it("accepts npm CLI's prefix-only token metadata", () => {
    expect(
      isConfiguredToken({ token: "npm_releaseCred" }, configuredToken),
    ).toBe(true);
  });

  it("rejects unrelated metadata, including npm's generic prefix", () => {
    expect(isConfiguredToken({ token: "npm" }, configuredToken)).toBe(false);
    expect(isConfiguredToken({ token: "npm_" }, configuredToken)).toBe(false);
    expect(isConfiguredToken({ token: "npm_r" }, configuredToken)).toBe(false);
    expect(
      isConfiguredToken({ token: "npm_otherCredential" }, configuredToken),
    ).toBe(false);
    expect(
      isConfiguredToken({ token: "npm_release...different" }, configuredToken),
    ).toBe(false);
  });

  it("rejects malformed or missing token metadata", () => {
    expect(
      isConfiguredToken({ token: "npm_release...123...456" }, configuredToken),
    ).toBe(false);
    expect(isConfiguredToken({ token: "" }, configuredToken)).toBe(false);
    expect(isConfiguredToken({}, configuredToken)).toBe(false);
    expect(isConfiguredToken({ token: "npm_release" }, "")).toBe(false);
  });

  it("leaves multiple matching shortened records ambiguous", () => {
    const records = [
      { token: "npm_releaseC" },
      { token: "npm_releaseCred" },
    ];

    expect(matchingConfiguredTokens(records, configuredToken)).toHaveLength(2);
    expect(uniquelyConfiguredToken(records, configuredToken)).toBeNull();
  });
});