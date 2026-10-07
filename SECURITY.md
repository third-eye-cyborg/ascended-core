# Security Policy

We take the security of Ascended Core seriously. Thank you for helping keep the
project and its downstream consumers safe.

## Reporting a vulnerability

Please **do not** report security vulnerabilities through public GitHub issues,
discussions, or pull requests.

Instead, report privately using **GitHub private vulnerability reporting**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**. This opens a private report that only you
   and the maintainers can see.
3. Include a clear description, affected package(s) and version(s), reproduction
   steps, and any suggested remediation.

If you cannot use GitHub private vulnerability reporting, open a public issue
titled "Request for private security contact" with no vulnerability details,
and a maintainer will arrange a private channel.

## Response targets

We aim to meet the following response targets:

- **Acknowledgement:** within 3 business days of a valid report.
- **Initial assessment / triage:** within 7 business days.
- **Fix or mitigation plan:** within 30 days for confirmed vulnerabilities,
  prioritized by severity.
- **Coordinated disclosure:** we will agree on a disclosure timeline with the
  reporter and publish an advisory once a fix is available.

These are targets, not guarantees; complex issues may take longer, and we will
keep reporters informed of progress.

## Good-faith security research

We will not pursue legal action against researchers who act in good faith under
this policy: test only your own local copies or installations of Ascended Core,
not systems or data you do not own (including the hosted Ascended Social
service); avoid privacy violations, data destruction, and service disruption;
and give us reasonable time to fix an issue before public disclosure. This
statement covers only Third Eye Cyborg, LLC and this repository; it cannot
authorize testing of anyone else's systems.

## Supported versions

Security fixes are provided for the following release line:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

As the project matures, this table will be updated to reflect the supported
release lines.

## Scope

Ascended Core is **vendor-neutral infrastructure**. This policy covers the
packages published from this repository (the `@third-eye-cyborg/*` packages) and the
reference examples.

## Automated dependency checks

Every pull request and push to `main` runs a production dependency audit:

```bash
pnpm audit:production
```

Dependabot also monitors npm and GitHub Actions dependencies and opens grouped
update pull requests for maintainer review. Updates are validated through the
same CI checks as every other pull request; alerts and updates are not
suppressed merely to make a check pass.

This repository is public. GitHub code scanning with CodeQL analyzes the
JavaScript/TypeScript sources and GitHub Actions workflows. Together with the
production dependency audit, Dependabot, least-privilege Actions permissions,
the boundary scan, the ScanCode license/copyright gate, and the package smoke
check, it forms the project's automated security baseline.

Out of scope:

- Vulnerabilities in downstream products built on top of Ascended Core
  (including the private downstream product). Report those to the respective
  product owners.
- Issues that require secrets, production schemas, or vendor-specific
  production adapters — none of which exist in this repository by design.
- Reports about third-party dependencies should also be reported upstream to
  the relevant project; we will update our dependency pins accordingly.
