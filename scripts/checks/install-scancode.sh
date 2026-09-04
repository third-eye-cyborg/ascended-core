#!/usr/bin/env bash
set -euo pipefail

# ScanCode is downloaded from its official GitHub release and verified against
# the digest published for that exact release asset. The toolkit is intentionally
# kept outside the repository and is not an npm runtime dependency.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="32.5.0"
PYTHON_BIN="${SCANCODE_PYTHON:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3.11 || command -v python3 || true)"
fi
if [[ -z "$PYTHON_BIN" ]]; then
  echo "error: ScanCode requires Python 3.11 or another compatible Python 3 runtime." >&2
  exit 1
fi

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  echo "error: the pinned installer currently supports Linux x86_64 in CI." >&2
  echo "       Install ScanCode Toolkit ${VERSION} separately and set SCANCODE_BIN." >&2
  exit 1
fi

ASSET="scancode-toolkit-v${VERSION}_py3.11-linux.tar.gz"
SHA256="99fd0a1ca46f984e6a35a1fa6990d0029e4e78b764bc43563009a2b2e020812a"
CACHE_ROOT="${SCANCODE_CACHE_DIR:-$ROOT/.cache/scancode-toolkit}"
ARCHIVE="$CACHE_ROOT/$ASSET"
TOOL_ROOT="$CACHE_ROOT/scancode-toolkit-v${VERSION}"
BASE_URL="https://github.com/aboutcode-org/scancode-toolkit/releases/download/v${VERSION}"

mkdir -p "$CACHE_ROOT"

if [[ ! -f "$ARCHIVE" ]]; then
  tmp_archive="$ARCHIVE.tmp.$$"
  trap 'rm -f "$tmp_archive"' EXIT
  curl -sSfL --retry 3 --connect-timeout 15 --max-time 900 \
    "$BASE_URL/$ASSET" -o "$tmp_archive"
  mv "$tmp_archive" "$ARCHIVE"
  trap - EXIT
fi

printf '%s  %s\n' "$SHA256" "$ARCHIVE" | sha256sum --check --status

if [[ ! -x "$TOOL_ROOT/venv/bin/scancode" ]]; then
  tmp_extract="$CACHE_ROOT/.extract.$$"
  rm -rf "$tmp_extract"
  mkdir -p "$tmp_extract"
  tar -xzf "$ARCHIVE" -C "$tmp_extract"
  rm -rf "$TOOL_ROOT"
  mv "$tmp_extract/scancode-toolkit-v${VERSION}" "$TOOL_ROOT"
  rmdir "$tmp_extract"

  (
    cd "$TOOL_ROOT"
    env \
      -u PIP_CONFIG_FILE \
      -u PYTHONUSERBASE \
      -u UV_PROJECT_ENVIRONMENT \
      -u PIP_USER \
      -u PIP_REQUIRE_VIRTUALENV \
      PYTHON_EXECUTABLE="$PYTHON_BIN" \
      ./configure
  )
fi

test -x "$TOOL_ROOT/venv/bin/scancode"
PATH="$TOOL_ROOT/venv/bin:$PATH" "$TOOL_ROOT/venv/bin/scancode" --version

if [[ -n "${GITHUB_PATH:-}" ]]; then
  printf '%s\n' "$TOOL_ROOT/venv/bin" >> "$GITHUB_PATH"
fi

echo "ScanCode installed at $TOOL_ROOT"
