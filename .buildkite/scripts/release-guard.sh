#!/usr/bin/env bash
# Temporary npm release fallback (sourced by release-checks.sh and publish.sh).
# Refuses to continue unless:
#   - BUILDKITE_TAG (v<version>) or RELEASE_VERSION matches the root
#     package.json version, and every packages/* manifest has that version;
#   - the commit being built is on origin/main.
# Exports RELEASE_VERSION for the caller.

release_guard() {
  local root_version tag_version="" requested=""
  root_version="$(node -p "require('./package.json').version")"

  if [[ -n "${BUILDKITE_TAG:-}" ]]; then
    tag_version="${BUILDKITE_TAG#v}"
    if [[ "${tag_version}" != "${root_version}" ]]; then
      echo "Refusing to release: tag ${BUILDKITE_TAG} does not match package.json version ${root_version}." >&2
      return 1
    fi
    requested="${tag_version}"
  fi

  if [[ -n "${RELEASE_VERSION:-}" ]]; then
    if [[ "${RELEASE_VERSION}" != "${root_version}" ]]; then
      echo "Refusing to release: RELEASE_VERSION=${RELEASE_VERSION} does not match package.json version ${root_version}." >&2
      return 1
    fi
    requested="${RELEASE_VERSION}"
  fi

  if [[ -z "${requested}" ]]; then
    echo "Refusing to release: set RELEASE_VERSION=${root_version} on the build (or build the v${root_version} tag)." >&2
    return 1
  fi

  local manifest version mismatched=0
  for manifest in packages/*/package.json; do
    version="$(node -p "require('./${manifest}').version")"
    if [[ "${version}" != "${requested}" ]]; then
      echo "Version mismatch: ${manifest} is ${version}, expected ${requested}." >&2
      mismatched=1
    fi
  done
  if [[ "${mismatched}" -ne 0 ]]; then
    return 1
  fi

  git fetch --quiet origin "+refs/heads/main:refs/remotes/origin/main"
  local head
  head="$(git rev-parse HEAD)"
  if ! git merge-base --is-ancestor "${head}" refs/remotes/origin/main; then
    echo "Refusing to release: commit ${head} is not on main." >&2
    return 1
  fi

  export RELEASE_VERSION="${requested}"
  echo "Release guard passed: ${RELEASE_VERSION} from ${head} (on main)."
}
