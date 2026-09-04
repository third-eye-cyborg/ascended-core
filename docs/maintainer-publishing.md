# Maintainer publishing

Ascended Core uses the **Ascended Social Publishing Org** GitHub App for
automation-authored branches and pull requests. The App is installed only on
explicitly selected repositories and is not allowed to bypass protection on
`main`.

## Required environment secrets

Maintain the following values in the secure environment that performs the
publish. Never commit or print them:

- `ASCENDED_PUBLISH_GITHUB_APP_ID`
- `ASCENDED_PUBLISH_GITHUB_APP_PRIVATE_KEY`

The App installation must grant this repository `Contents: write` and
`Pull requests: write`. The token helper requests only those repository-scoped
permissions and emits a short-lived installation token.

## Publish a review branch

Create and commit a branch whose name is not `main`, then run:

```sh
PUBLISH_PR_TITLE="fix: describe the reviewed change" \
  bash scripts/publish-review-branch.sh
```

The script:

1. refuses to run from `main` or with uncommitted changes;
2. mints a token scoped to `third-eye-cyborg/ascended-core`;
3. pushes only the current review branch;
4. opens a pull request against protected `main`.

The maintainer reviews and approves the pull request. GitHub's protected merge
path, not the publishing App, creates the final commit on `main`.