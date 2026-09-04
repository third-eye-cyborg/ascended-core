#!/usr/bin/env node

import crypto from "node:crypto";

const appId = process.env.ASCENDED_PUBLISH_GITHUB_APP_ID;
const rawPrivateKey = process.env.ASCENDED_PUBLISH_GITHUB_APP_PRIVATE_KEY;
const repository =
  process.env.ASCENDED_PUBLISH_GITHUB_REPOSITORY ??
  "third-eye-cyborg/ascended-core";

if (!appId || !rawPrivateKey) {
  console.error(
    "Missing ASCENDED_PUBLISH_GITHUB_APP_ID or " +
      "ASCENDED_PUBLISH_GITHUB_APP_PRIVATE_KEY.",
  );
  process.exit(1);
}

const match = repository.match(/^([^/]+)\/([^/]+)$/);
if (!match) {
  console.error(
    "ASCENDED_PUBLISH_GITHUB_REPOSITORY must use owner/repository format.",
  );
  process.exit(1);
}

function normalizePem(value) {
  const expanded = value.replace(/\\n/g, "\n").replace(/\r/g, "");
  const pem = expanded.match(
    /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/,
  );
  if (!pem) {
    throw new Error("The GitHub App private key is not a complete PEM document.");
  }

  const [, type, rawBody] = pem;
  const body = rawBody.replace(/[^A-Za-z0-9+/=]/g, "");
  const wrappedBody = body.match(/.{1,64}/g)?.join("\n");
  if (!wrappedBody) {
    throw new Error("The GitHub App private key has an empty PEM body.");
  }

  return `-----BEGIN ${type}-----\n${wrappedBody}\n-----END ${type}-----\n`;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function github(path, token, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub App request failed (${response.status}): ` +
        `${body.message ?? "unknown error"}`,
    );
  }

  return response.json();
}

const now = Math.floor(Date.now() / 1000);
const unsignedJwt = [
  encode({ alg: "RS256", typ: "JWT" }),
  encode({ iat: now - 60, exp: now + 540, iss: appId }),
].join(".");
const signature = crypto
  .sign("RSA-SHA256", Buffer.from(unsignedJwt), normalizePem(rawPrivateKey))
  .toString("base64url");
const appJwt = `${unsignedJwt}.${signature}`;

const [, owner, name] = match;
const installation = await github(
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/installation`,
  appJwt,
);
const access = await github(
  `/app/installations/${installation.id}/access_tokens`,
  appJwt,
  {
    method: "POST",
    body: JSON.stringify({
      repositories: [name],
      permissions: {
        contents: "write",
        pull_requests: "write",
      },
    }),
  },
);

if (!access.token) {
  throw new Error("GitHub did not return an installation token.");
}

process.stdout.write(access.token);