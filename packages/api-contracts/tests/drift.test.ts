import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { OperationCatalog } from "../src/index.js";
import { componentSchemas } from "../src/schemas.js";
import { runDriftCheck } from "../src/drift-check.js";

// Tests may use import.meta (they are never shipped); the shipped runtime
// entrypoint stays import.meta-free so the CommonJS build keeps working.
const SPEC_PATH = fileURLToPath(new URL("../spec/openapi.yaml", import.meta.url));

describe("runDriftCheck", () => {
  it("passes when the spec and code are aligned", async () => {
    const result = await runDriftCheck({ specPath: SPEC_PATH });
    expect(result.schemaNames.length).toBeGreaterThan(0);
    expect(result.operationIds.length).toBeGreaterThan(0);
    // Every spec schema name has a matching exported zod schema.
    for (const name of result.schemaNames) {
      expect(Object.keys(componentSchemas)).toContain(name);
    }
    // Every spec operationId is present in the catalog.
    for (const id of result.operationIds) {
      expect(Object.keys(OperationCatalog)).toContain(id);
    }
  });

  it("detects schema drift (fails when a component schema is missing)", async () => {
    // Simulate drift by temporarily removing a known key from the exported map.
    const key = "Profile";
    const backup = componentSchemas[key];
    const mutable = componentSchemas as unknown as Record<string, unknown>;
    delete mutable[key];
    try {
      await expect(runDriftCheck({ specPath: SPEC_PATH })).rejects.toThrow(/Profile/);
    } finally {
      mutable[key] = backup;
    }
  });

  it("detects operation drift (fails when an operationId is missing)", async () => {
    const key = "getHealthz";
    const backup = OperationCatalog[key];
    const mutable = OperationCatalog as unknown as Record<string, unknown>;
    delete mutable[key];
    try {
      await expect(runDriftCheck({ specPath: SPEC_PATH })).rejects.toThrow(/getHealthz/);
    } finally {
      mutable[key] = backup;
    }
  });
});
