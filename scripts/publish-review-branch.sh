#!/bin/bash
# Publish the current branch through the Ascended Social Publishing Org App.
# This script refuses main, force pushes, and repositories other than Core.

set -euo pipefail

REPO="third-eye-cyborg/ascended-core"
BRANCH="$(git branch --show-current)"

if [ -z "$BRANCH" ] || [ "$BRANCH" = "main" ]; then
  echo "ERROR: create a review branch before publishing." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: commit or discard local changes before publishing." >&2
  exit 1
fi

export ASCENDED_PUBLISH_GITHUB_REPOSITORY="$REPO"
TOKEN="$(node scripts/github-app-installation-token.mjs)"
AUTH_URL="https://x-access-token:${TOKEN}@github.com/${REPO}.git"

echo "==> Pushing bot review branch ${BRANCH}..."
GIT_ASKPASS=/bin/true GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper='' push "$AUTH_URL" "HEAD:refs/heads/${BRANCH}"

PAYLOAD="$(node -e '
  const [title, head] = process.argv.slice(1);
  process.stdout.write(JSON.stringify({
    title,
    head,
    base: "main",
    body: "Published by the Ascended Social Publishing Org App. Main remains protected and requires human review.",
  }));
' "${PUBLISH_PR_TITLE:-chore: publish reviewed Core changes}" "$BRANCH")"

RESPONSE="$(curl -fsS -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/pulls" \
  -d "$PAYLOAD")"

PR_URL="$(node -e '
  let body = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => body += chunk);
  process.stdin.on("end", () => {
    const value = JSON.parse(body);
    if (!value.html_url) process.exit(1);
    process.stdout.write(value.html_url);
  });
' <<<"$RESPONSE")"

echo "==> Created review-required PR: ${PR_URL}"