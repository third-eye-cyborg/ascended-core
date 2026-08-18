#!/usr/bin/env node

/**
 * Run ScanCode against the tracked repository surface and enforce the
 * repository's licensing/copyright review policy.
 *
 * ScanCode findings are evidence for review, not legal advice. This gate is
 * deliberately strict for unexpected copyleft/unknown license detections and
 * copyright holders, while allowing documented files that intentionally contain
 * synthetic license examples.
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const POLICY_PATH = join(ROOT, "compliance", "scancode-policy.json");
const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
const reportPath = resolve(
  ROOT,
  process.env.SCANCODE_REPORT ?? ".reports/scancode/scancode.json",
);
const reportDir = dirname(reportPath);
mkdirSync(reportDir, { recursive: true });

const version = policy.tool.version;
const cacheRoot = process.env.SCANCODE_CACHE_DIR ?? join(ROOT, ".cache/scancode-toolkit");
const defaultTool = join(
  cacheRoot,
  `scancode-toolkit-v${version}`,
  "venv/bin/scancode",
);

function commandExists(command) {
  const result = spawnSync("bash", ["-lc", `command -v ${JSON.stringify(command)}`], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

const scancodeBin =
  process.env.SCANCODE_BIN ||
  commandExists("scancode") ||
  (existsSync(defaultTool) ? defaultTool : "");

if (!scancodeBin) {
  console.error(
    "error: ScanCode is not installed. Run `bash scripts/checks/install-scancode.sh` " +
      "or set SCANCODE_BIN to a compatible ScanCode executable.",
  );
  process.exit(1);
}

const scanEnv = {
  ...process.env,
  PATH: `${dirname(scancodeBin)}:${process.env.PATH ?? ""}`,
};

const scanArgs = [
  "--license",
  "--copyright",
  "--package",
  "--info",
  "--strip-root",
  "--ignore",
  ".git",
  "--ignore",
  "node_modules",
  "--ignore",
  "dist",
  "--ignore",
  "coverage",
  "--ignore",
  ".cache",
  "--ignore",
  ".reports",
  "--json-pp",
  reportPath,
  ROOT,
];

console.log(`scancode: scanning tracked repository surface with ${basename(scancodeBin)} ${version}`);
const scan = spawnSync(scancodeBin, scanArgs, {
  cwd: ROOT,
  env: scanEnv,
  stdio: "inherit",
});
if (scan.error) {
  console.error(`error: could not execute ScanCode: ${scan.error.message}`);
  process.exit(1);
}
if (scan.status !== 0) {
  console.error(`error: ScanCode exited with status ${scan.status ?? "unknown"}`);
  process.exit(scan.status || 1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const reviewOnlyPaths = policy.reviewOnlyPaths ?? {};
const allowedLicenses = new Set(policy.allowedLicenseKeys ?? []);
const forbiddenPrefixes = policy.forbiddenLicenseKeyPrefixes ?? [];
const allowedHolders = (policy.allowedCopyrightHolders ?? []).map((holder) =>
  holder.toLowerCase(),
);

function pathIsReviewOnly(filePath) {
  return Object.prototype.hasOwnProperty.call(reviewOnlyPaths, filePath);
}

function licenseKeysForDetection(detection) {
  const keys = [];
  if (detection.license_expression) keys.push(detection.license_expression);
  for (const match of detection.matches ?? []) {
    if (match.license_expression) keys.push(match.license_expression);
  }
  return [...new Set(keys.flatMap((value) => value.split(/\s+(?:AND|OR)\s+/i)))].map(
    (value) => value.replace(/[()]/g, "").trim().toLowerCase(),
  );
}

function isForbiddenLicense(key) {
  return forbiddenPrefixes.some(
    (prefix) => key === prefix || key.startsWith(`${prefix}-`),
  );
}

function isAllowedLicense(key) {
  return allowedLicenses.has(key) || key === "mit OR apache-2.0";
}

function hasAllowedHolder(copyright) {
  const normalized = copyright.toLowerCase().replace(/[().,:]/g, " ");
  return allowedHolders.some((holder) => normalized.includes(holder));
}

const findings = [];
const reviewDetections = [];
let filesScanned = 0;

for (const file of report.files ?? []) {
  if (file.type !== "file") continue;
  filesScanned += 1;
  const filePath = file.path;
  const reviewOnly = pathIsReviewOnly(filePath);

  for (const detection of file.license_detections ?? []) {
    const keys = licenseKeysForDetection(detection);
    const forbidden = keys.filter(isForbiddenLicense);
    const unknown = keys.filter(
      (key) => !isAllowedLicense(key) && !isForbiddenLicense(key),
    );

    if (reviewOnly && (forbidden.length > 0 || unknown.length > 0)) {
      reviewDetections.push({
        path: filePath,
        licenses: [...new Set([...forbidden, ...unknown])],
        reason: reviewOnlyPaths[filePath],
      });
      continue;
    }

    if (forbidden.length > 0) {
      findings.push({
        type: "copyleft-license",
        path: filePath,
        licenses: [...new Set(forbidden)],
        message:
          "Unexpected copyleft/restricted license detection. Confirm this is not copied or bundled code, or document the required license review.",
      });
    } else if (unknown.length > 0) {
      findings.push({
        type: "unrecognized-license",
        path: filePath,
        licenses: [...new Set(unknown)],
        message:
          "License detection is not in the approved ScanCode policy. Identify the license and add an explicit decision before release.",
      });
    }
  }

  for (const copyright of file.copyrights ?? []) {
    const text = copyright.copyright;
    if (!text || hasAllowedHolder(text) || reviewOnly) continue;
    findings.push({
      type: "copyright-holder",
      path: filePath,
      copyright: text,
      message:
        "Unexpected copyright holder detected. Confirm attribution/redistribution rights before release.",
    });
  }
}

console.log(`scancode: analyzed ${filesScanned} files`);
console.log(`scancode: report written to ${relative(ROOT, reportPath)}`);

if (reviewDetections.length > 0) {
  console.log(
    `scancode: ${reviewDetections.length} detection(s) are in documented review-only paths:`,
  );
  for (const finding of reviewDetections) {
    console.log(
      `  REVIEW ${finding.path}: ${finding.licenses.join(", ")} — ${finding.reason}`,
    );
  }
}

if (findings.length > 0) {
  console.error(`scancode: ${findings.length} blocking finding(s):`);
  for (const finding of findings) {
    const detail = finding.licenses?.join(", ") ?? finding.copyright;
    console.error(`  ${finding.type} ${finding.path}: ${detail}`);
    console.error(`    ${finding.message}`);
  }
  console.error(
    "scancode: inspect the JSON report and resolve or explicitly review each finding before publishing.",
  );
  process.exit(1);
}

console.log("scancode: licensing and copyright policy passed");
