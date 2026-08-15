/**
 * Drift check between the OpenAPI document and the hand-maintained Zod schemas
 * plus the {@link OperationCatalog}. This function is intentionally package
 * internal (the package scripts config is frozen) and is invoked from
 * `tests/drift.test.ts`. It fails loudly whenever the spec and the code drift.
 *
 * Primary implementation parses the YAML with the "yaml" package. If that
 * import cannot be resolved at runtime, a minimal regex-based fallback reads
 * the file as text and asserts each `components.schemas` name appears in the
 * exported schemas.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { OperationCatalog } from "./index.js";
import { componentSchemas } from "./schemas.js";

/** Absolute path to the OpenAPI document shipped with this package. */
export const SPEC_PATH = fileURLToPath(
  new URL("../spec/openapi.yaml", import.meta.url),
);

/** Outcome of a successful drift check. */
export interface DriftCheckResult {
  /** Component schema names discovered in the spec. */
  readonly schemaNames: string[];
  /** operationIds discovered in the spec. */
  readonly operationIds: string[];
  /** Whether the strict YAML parser or the regex fallback was used. */
  readonly mode: "yaml" | "fallback";
}

interface OpenApiDocument {
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

async function loadSpec(): Promise<
  { doc: OpenApiDocument; mode: "yaml" } | { text: string; mode: "fallback" }
> {
  const text = readFileSync(SPEC_PATH, "utf8");
  try {
    const yaml = (await import("yaml")) as { parse: (input: string) => unknown };
    const doc = yaml.parse(text) as OpenApiDocument;
    return { doc, mode: "yaml" };
  } catch {
    return { text, mode: "fallback" };
  }
}

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "patch",
  "head",
  "options",
  "trace",
]);

function extractFromDocument(doc: OpenApiDocument): {
  schemaNames: string[];
  operationIds: string[];
} {
  const schemaNames = Object.keys(doc.components?.schemas ?? {});
  const operationIds: string[] = [];
  const paths = doc.paths ?? {};
  for (const pathItem of Object.values(paths)) {
    if (pathItem === null || typeof pathItem !== "object") continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      if (operation === null || typeof operation !== "object") continue;
      const opId = (operation as { operationId?: unknown }).operationId;
      if (typeof opId === "string") operationIds.push(opId);
    }
  }
  return { schemaNames, operationIds };
}

function extractFromText(text: string): {
  schemaNames: string[];
  operationIds: string[];
} {
  const schemaNames: string[] = [];
  const schemaSectionMatch = text.match(
    /\n {2}schemas:\n([\s\S]*?)(?=\n[A-Za-z])/,
  );
  const schemaSection = schemaSectionMatch?.[1] ?? "";
  const schemaRe = /\n {4}([A-Za-z][A-Za-z0-9]*):/g;
  let match: RegExpExecArray | null;
  while ((match = schemaRe.exec(schemaSection)) !== null) {
    const name = match[1];
    if (name !== undefined) schemaNames.push(name);
  }

  const operationIds: string[] = [];
  const opRe = /operationId:\s*([A-Za-z][A-Za-z0-9]*)/g;
  while ((match = opRe.exec(text)) !== null) {
    const id = match[1];
    if (id !== undefined) operationIds.push(id);
  }
  return { schemaNames, operationIds };
}

/**
 * Run the drift check. Throws an Error describing the first mismatch found, or
 * returns a {@link DriftCheckResult} when the spec and code are aligned.
 */
export async function runDriftCheck(): Promise<DriftCheckResult> {
  const loaded = await loadSpec();
  const { schemaNames, operationIds } =
    loaded.mode === "yaml"
      ? extractFromDocument(loaded.doc)
      : extractFromText(loaded.text);

  if (schemaNames.length === 0) {
    throw new Error(
      "Drift check found no component schemas in the OpenAPI document.",
    );
  }
  if (operationIds.length === 0) {
    throw new Error(
      "Drift check found no operationIds in the OpenAPI document.",
    );
  }

  const exportedSchemaNames = new Set(Object.keys(componentSchemas));
  const missingSchemas = schemaNames.filter(
    (name) => !exportedSchemaNames.has(name),
  );
  if (missingSchemas.length > 0) {
    throw new Error(
      `Drift detected: spec component schema(s) missing a matching exported zod schema: ${missingSchemas.join(", ")}`,
    );
  }

  const extraSchemas = [...exportedSchemaNames].filter(
    (name) => !schemaNames.includes(name),
  );
  if (extraSchemas.length > 0) {
    throw new Error(
      `Drift detected: exported zod schema(s) with no matching spec component schema: ${extraSchemas.join(", ")}`,
    );
  }

  const catalogIds = new Set(Object.keys(OperationCatalog));
  const missingOps = operationIds.filter((id) => !catalogIds.has(id));
  if (missingOps.length > 0) {
    throw new Error(
      `Drift detected: spec operationId(s) missing from OperationCatalog: ${missingOps.join(", ")}`,
    );
  }

  const extraOps = [...catalogIds].filter((id) => !operationIds.includes(id));
  if (extraOps.length > 0) {
    throw new Error(
      `Drift detected: OperationCatalog operation(s) with no matching spec operationId: ${extraOps.join(", ")}`,
    );
  }

  return {
    schemaNames,
    operationIds,
    mode: loaded.mode,
  };
}
