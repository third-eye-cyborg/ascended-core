/**
 * Enumerates the exact workspace set that `pnpm -r publish` considers:
 * every non-private workspace package, wherever it lives in the repo.
 *
 * Release checks must use this enumeration (never a hard-coded directory
 * scan) so a publishable workspace added outside `packages/`, or with an
 * unexpected name, can never be published unchecked.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function listPublishableWorkspaces(root) {
  const raw = execFileSync("pnpm", ["-r", "ls", "--depth", "-1", "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  return JSON.parse(raw)
    .filter((entry) => entry.private !== true)
    .map((entry) => {
      const manifest = join(entry.path, "package.json");
      return {
        path: entry.path,
        manifest,
        pkg: JSON.parse(readFileSync(manifest, "utf8")),
      };
    });
}
