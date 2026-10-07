# Security Policy

We take the security of Ascended Core seriously. Thank you for helping keep the
project and its downstream consumers safe.

## Reporting a vulnerability

Please **do not** report security vulnerabilities through public GitHub issues,
discussions, or pull requests.

Instead, report privately using **GitHub private vulnerability reporting**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**. This opens a private report that only you,
   the repository's maintainers, and anyone they invite to help with the fix
   can see.
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
  reporter and, where appropriate, publish a security advisory once a fix is
  available.

These are targets, not guarantees; complex issues may take longer, and we will
keep reporters informed of progress.

## Good-faith security research

We welcome good-faith security research on Ascended Core.

**In scope.** The source code in this repository and the `@third-eye-cyborg/*`
packages and reference examples published from it, tested only on systems you
own or are otherwise allowed to test (for example, a local copy or your own
installation).

**Not in scope.** This policy does not authorize testing of:
- the hosted Ascended Social service or apps, or any other system, network, or
  account operated by Third Eye Cyborg, LLC; or
- any third party's systems or services, including the hosting, identity,
  payment, email, and infrastructure providers used by us or by products built
  on Ascended Core, or anyone else's installation of Ascended Core.

We cannot give permission to test systems we do not own. If you believe an
issue in Ascended Core affects one of those systems, report it to us without
testing it there.

**Our commitment.** If you make a good-faith effort to follow this policy, we
will not bring or support legal action against you for that research, and we
will not pursue claims against you for it under anti-hacking or
anti-circumvention laws (such as the U.S. Computer Fraud and Abuse Act or the
anti-circumvention provisions of the DMCA), to the extent we are able. If a
third party brings a legal claim against you for research that followed this
policy, we will make it known that your research was conducted under this
policy. This commitment is made only by Third Eye Cyborg, LLC; it does not
bind anyone else and does not cover activity outside this policy.

**What we ask of you.**
- Avoid privacy violations, destruction or corruption of data, and any
  degradation or interruption of service.
- Do not access, copy, modify, or keep data that is not yours beyond the
  minimum needed to demonstrate the issue. If you encounter someone else's
  data, stop, do not share it, and tell us.
- Report the issue to us promptly through GitHub private vulnerability
  reporting.
- Keep the details confidential until a fix is released or we agree on a
  disclosure date with you, and give us a reasonable time to fix the issue
  before any public disclosure.
- Do not use social engineering, phishing, physical attacks, or threats, and do
  not make disclosure conditional on payment.

We do not offer a bug bounty or other payment for reports. If you are unsure
whether something is in scope, ask us through private vulnerability reporting
before you test.

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

This repository is public. GitHub code scanning with CodeQL is configured for
the JavaScript/TypeScript sources and GitHub Actions workflows. Together with
the production dependency audit, Dependabot, least-privilege Actions
permissions, the boundary scan, the ScanCode license/copyright gate, and the
package smoke check, these checks make up the project's automated security
baseline.

Out of scope:

- Vulnerabilities in downstream products built on top of Ascended Core
  (including the private downstream product). Report those to the respective
  product owners.
- Issues that require secrets, production schemas, or vendor-specific
  production adapters — none of which exist in this repository by design.
- Reports about third-party dependencies should also be reported upstream to
  the relevant project; we will update our dependency pins accordingly.
