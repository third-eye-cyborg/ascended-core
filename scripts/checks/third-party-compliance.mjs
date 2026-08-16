import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const policy = JSON.parse(readFileSync(join(root, "compliance/license-policy.json"), "utf8"));
const publicPackages = readdirSync(join(root, "packages"))
  .map((dir) => ({ dir, path: join(root, "packages", dir), manifest: join(root, "packages", dir, "package.json") }))
  .filter(({ manifest }) => existsSync(manifest))
  .map((entry) => ({ ...entry, pkg: JSON.parse(readFileSync(entry.manifest, "utf8")) }))
  .filter(({ pkg }) => !pkg.private && pkg.name?.startsWith("@third-eye-cyborg/ascended-"));

const failures = [];
const fail = (message) => failures.push(message);
const repositoryUrl = "git+https://github.com/third-eye-cyborg/ascended-core.git";
const homepage = "https://github.com/third-eye-cyborg/ascended-core#readme";
const bugsUrl = "https://github.com/third-eye-cyborg/ascended-core/issues";

for (const { dir, path, pkg } of publicPackages) {
  if (pkg.license !== "Apache-2.0") fail(`${pkg.name}: expected Apache-2.0 license metadata`);
  if (pkg.author !== "Third Eye Cyborg LLC") fail(`${pkg.name}: missing publisher identity`);
  if (pkg.repository?.url !== repositoryUrl || pkg.repository?.directory !== `packages/${dir}`) fail(`${pkg.name}: missing canonical repository metadata`);
  if (pkg.homepage !== homepage || pkg.bugs?.url !== bugsUrl) fail(`${pkg.name}: missing canonical project links`);
  if (!pkg.files?.includes("LICENSE") || !existsSync(join(path, "LICENSE"))) fail(`${pkg.name}: LICENSE is not packaged`);

  const external = Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith("@third-eye-cyborg/"));
  if (external.length) {
    const notice = join(path, "THIRD_PARTY_NOTICES.md");
    if (!pkg.files?.includes("THIRD_PARTY_NOTICES.md") || !existsSync(notice)) fail(`${pkg.name}: runtime dependency notice is not packaged`);
    const text = existsSync(notice) ? readFileSync(notice, "utf8") : "";
    for (const dependency of external) if (!text.includes(dependency)) fail(`${pkg.name}: notice does not name ${dependency}`);
  }
}

const rawReport = execFileSync("pnpm", ["-r", "licenses", "list", "--prod", "--json"], { cwd: root, encoding: "utf8" });
const report = JSON.parse(rawReport);
const resolved = Object.values(report).flat().flatMap((entry) => entry.versions.map((version) => ({ name: entry.name, version, license: entry.license })));
for (const dependency of resolved) {
  if (!policy.allowedProductionLicenses.includes(dependency.license)) fail(`${dependency.name}@${dependency.version}: disallowed production license ${dependency.license}`);
  const approved = policy.approvedProductionDependencies[dependency.name];
  if (!approved || approved.license !== dependency.license) fail(`${dependency.name}@${dependency.version}: dependency is absent from the approval policy`);
}

const outputIndex = process.argv.indexOf("--sbom");
if (outputIndex !== -1) {
  const output = process.argv[outputIndex + 1];
  if (!output) fail("--sbom requires an output path");
  else {
    const packages = [
      ...publicPackages.map(({ pkg }) => ({ SPDXID: `SPDXRef-${pkg.name.replace(/[^A-Za-z0-9.-]/g, "-")}`, name: pkg.name, versionInfo: pkg.version, licenseConcluded: pkg.license, downloadLocation: "NOASSERTION" })),
      ...resolved.map((dependency) => ({ SPDXID: `SPDXRef-${dependency.name}-${dependency.version}`.replace(/[^A-Za-z0-9.-]/g, "-"), name: dependency.name, versionInfo: dependency.version, licenseConcluded: dependency.license, downloadLocation: "NOASSERTION" })),
    ];
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify({ SPDXID: "SPDXRef-DOCUMENT", spdxVersion: "SPDX-2.3", name: "Ascended Core production dependencies", dataLicense: "CC0-1.0", documentNamespace: "https://github.com/third-eye-cyborg/ascended-core/sbom/0.1.0", creationInfo: { creators: ["Tool: Ascended Core third-party-compliance"], created: new Date().toISOString() }, packages }, null, 2)}\n`);
    console.log(`wrote SPDX SBOM: ${output}`);
  }
}

if (failures.length) {
  for (const message of failures) console.error(`FAIL ${message}`);
  process.exit(1);
}
console.log(`third-party compliance passed: ${publicPackages.length} packages, ${resolved.length} resolved production dependency entries`);