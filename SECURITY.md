# Security Policy

We take the security of Ascended Core seriously. Thank you for helping keep the
project and its downstream consumers safe.

## Reporting a vulnerability

Please **do not** report security vulnerabilities through public GitHub issues,
discussions, or pull requests.

Instead, report privately using **GitHub Security Advisories**:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** to open a private advisory.
3. Include a clear description, affected package(s) and version(s), reproduction
   steps, and any suggested remediation.

If you cannot use GitHub Security Advisories, contact the maintainers privately
through GitHub so we can arrange a secure channel.

## Response SLAs

We aim to meet the following response targets:

- **Acknowledgement:** within 3 business days of a valid report.
- **Initial assessment / triage:** within 7 business days.
- **Fix or mitigation plan:** within 30 days for confirmed vulnerabilities,
  prioritized by severity.
- **Coordinated disclosure:** we will agree on a disclosure timeline with the
  reporter and publish an advisory once a fix is available.

These are targets, not guarantees; complex issues may take longer, and we will
keep reporters informed of progress.

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
packages published from this repository (the `@third-eye-cyborg/ascended-*` packages) and the
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

GitHub Code Scanning is not enabled for this private repository's current GitHub
configuration. Until it is available, the dependency audit, Dependabot,
least-privilege Actions permissions, boundary scan, package smoke check, and
private vulnerability reporting process are the project's automated security
baseline.

Out of scope:

- Vulnerabilities in downstream products built on top of Ascended Core
  (including the private downstream product). Report those to the respective
  product owners.
- Issues that require secrets, production schemas, or vendor-specific
  production adapters — none of which exist in this repository by design.
- Reports about third-party dependencies should also be reported upstream to
  the relevant project; we will update our dependency pins accordingly.
