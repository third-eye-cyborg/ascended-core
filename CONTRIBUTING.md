# Contributing to Ascended Core

Thanks for your interest in improving Ascended Core! This project is
open-source infrastructure for privacy-conscious spiritual and community
applications. Contributions of all kinds are welcome — bug fixes, new
provider ports, documentation, tests, and design discussion.

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development setup

Ascended Core is a pnpm monorepo. You need **Node >= 20** and **pnpm >= 9**.

```sh
pnpm install
pnpm check   # typecheck + lint + test + build across all packages
```

Useful scripts:

- `pnpm typecheck` — strict TypeScript check for every package.
- `pnpm lint` — ESLint across sources and tests.
- `pnpm test` — Vitest across every package.
- `pnpm build` — tsup build for every publishable package.
- `pnpm --filter @third-eye-cyborg/example-minimal-server smoke` — run the reference server smoke test.
- `node scripts/checks/boundary-scan.mjs` — run the boundary scan locally.

## Package conventions

- Each package builds with **tsup** and tests with **vitest**.
- **Strict TypeScript** is enabled repo-wide, including `noUncheckedIndexedAccess`.
  Handle possibly-undefined index access explicitly.
- Public packages publish under the `@third-eye-cyborg` npm scope with
  `publishConfig.access = "public"`.
- Keep the public API surface exported from each package's `src/index.ts`.
- Do **not** edit `package.json`, `tsconfig.json`, or `vitest.config.ts` in a
  package unless your change specifically requires it and is reviewed.

## Commit & PR conventions

- We use [Conventional Commits](https://www.conventionalcommits.org/) for both
  commit messages and PR titles (for example `feat(privacy): add jurisdiction router`).
  PR titles are linted automatically.
- Keep PRs focused and include a clear summary and test plan.
- Fill out the pull request template, including the boundary checklist.
- Ensure CI is green: typecheck, lint, test, build, and the boundary scan must pass.
- Maintainer automation publishes branches and opens pull requests through the
  branded GitHub App described in
  [Maintainer publishing](./docs/maintainer-publishing.md). The App does not
  bypass protected `main`.

## Boundary rules for contributions

Ascended Core is vendor-neutral by design. These rules are strict and are
enforced by the boundary scan (`scripts/checks/boundary-scan.mjs`) and by
maintainer review:

- **No vendor-specific production adapters in core.** Core packages contain
  vendor-neutral *ports* (interfaces) and generic in-memory adapters only.
  Refer to vendors generically — for example "a cloud identity provider" or
  "an object-storage provider" — never by name.
- **Synthetic data only.** Examples, fixtures, and tests must use synthetic
  data: names like *Ada Example*, the `example.com` domain, and ids from
  `createId(...)`. Never commit real user data, production schemas, secrets,
  or credentials.
- **No product vocabulary hard-coded in code.** Spiritual/product concepts
  (such as chakras, elements, or sigils in a downstream product) belong in
  metadata extension points, not in Core types or logic.
- **No secrets, billing logic, moderation/compliance internals, admin tooling,
  or row-level-security policies** in this repository.

If you need to demonstrate a real vendor integration, do it in your own
downstream project — not here. Reference adapters in `examples/` illustrate the
*shape* of an integration using generic, vendor-free code.

## Reporting security issues

Please do **not** open public issues for security problems. Follow the process
in [SECURITY.md](./SECURITY.md).
