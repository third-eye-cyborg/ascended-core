import { describe, expect, it } from "vitest";

import {
  hasGitHubActionsOidcEnvironment,
  isAtLeastVersion,
  isPublicPackageManifest,
  parseVersion,
} from "../verify-npm-publish-access.mjs";

describe("trusted publishing preflight helpers", () => {
  it("requires GitHub's complete OIDC environment", () => {
    expect(
      hasGitHubActionsOidcEnvironment({
        GITHUB_ACTIONS: "true",
        ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.githubusercontent.com",
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
      }),
    ).toBe(true);
    expect(
      hasGitHubActionsOidcEnvironment({
        GITHUB_ACTIONS: "true",
        ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.githubusercontent.com",
      }),
    ).toBe(false);
  });

  it("parses and compares semantic runtime versions", () => {
    expect(parseVersion("v22.14.0")).toEqual([22, 14, 0]);
    expect(parseVersion("11.5.1")).toEqual([11, 5, 1]);
    expect(parseVersion("22")).toBeNull();
    expect(isAtLeastVersion([22, 14, 0], [22, 14, 0])).toBe(true);
    expect(isAtLeastVersion([22, 15, 0], [22, 14, 0])).toBe(true);
    expect(isAtLeastVersion([22, 13, 9], [22, 14, 0])).toBe(false);
  });

  it("accepts only public manifests in the canonical npm scope", () => {
    expect(
      isPublicPackageManifest({
        name: "@third-eye-cyborg/core",
        publishConfig: { access: "public" },
      }),
    ).toBe(true);
    expect(
      isPublicPackageManifest({
        name: "@third-eye-cyborg/core",
        private: true,
        publishConfig: { access: "public" },
      }),
    ).toBe(false);
    expect(
      isPublicPackageManifest({
        name: "@other/core",
        publishConfig: { access: "public" },
      }),
    ).toBe(false);
    expect(
      isPublicPackageManifest({
        name: "@third-eye-cyborg/core",
      }),
    ).toBe(false);
  });
});
