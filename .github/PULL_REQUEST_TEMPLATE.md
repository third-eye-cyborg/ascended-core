<!--
Thanks for contributing to Ascended Core! Please use a Conventional Commit
style PR title (for example: feat(privacy): add jurisdiction router).
-->

## Summary

<!-- What does this PR change, and why? -->

## Boundary checklist

- [ ] No vendor-specific production adapters added to Core (ports + generic
      in-memory adapters only; vendors referred to generically).
- [ ] Synthetic data only (e.g. "Ada Example", `example.com`, `createId(...)`
      ids) — no real user data, secrets, or production schemas.
- [ ] No product vocabulary hard-coded (spiritual/product concepts live in
      metadata extension points).
- [ ] Docs updated where relevant (README, docs/, examples).

## Test plan

<!-- How did you verify this change? Commands, cases covered, etc. -->

- [ ] `pnpm check` passes (typecheck, lint, test, build).
- [ ] `node scripts/checks/boundary-scan.mjs` exits 0.
