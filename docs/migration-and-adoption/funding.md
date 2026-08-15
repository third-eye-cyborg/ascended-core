# Funding

Ascended Core is open source. To sustain maintenance, documentation, infra, and
security review transparently, the project raises and spends funds through a
**fiscal-hosted collective** on Open Collective. A fiscal host holds funds and
handles the legal/accounting side so maintainers can focus on the software.

> **Important boundary:** the Collective funds the **open engine only**. Any
> downstream product subscriptions or entitlements (for the private hosted
> product) are a **separate legal and financial matter** and must never be routed
> through, comingled with, or represented by the Collective. See the final
> section.

## Setup steps

1. **Create the collective profile** on Open Collective — name, description,
   logo, and a short mission that describes Ascended Core as an open,
   provider-agnostic engine. Keep all copy vendor-free and synthetic-friendly.

2. **Apply to a fiscal host.** The **Open Source Collective** is the natural fit
   for open-source projects and is the recommended host.
   - **Verify current eligibility and the fee schedule before launch.** Host
     terms, acceptance criteria, and the host fee percentage change over time —
     confirm the up-to-date requirements and fees directly with the host, and do
     not hard-code a fee figure in these docs.
   - Complete the host's application and wait for acceptance before publicizing
     funding.

3. **Add the funding URL to `.github/FUNDING.yml`** once the collective exists,
   so the platform surfaces a "Sponsor" button on the repo:

   ```yaml
   # .github/FUNDING.yml
   open_collective: <your-collective-slug>
   ```

   Create this file only after the collective profile is live and the slug is
   final.

4. **Publish an expense policy** on the collective so spending is transparent and
   contributors know what the fund covers. The policy should enumerate eligible
   categories and how expenses are approved.

## Expense policy (what funds cover)

Funds are spent on sustaining the open engine. Eligible categories:

- **Maintainer time** — reviewing PRs, triage, releases, and roadmap work.
- **Documentation** — writing and maintaining these docs and examples.
- **Infrastructure** — CI, package publishing, and project tooling costs.
- **Security review** — audits, dependency review, and remediation.

Expenses are submitted on Open Collective with receipts/description, reviewed by
maintainers per the published policy, and paid out by the fiscal host. All
transactions are public on the collective ledger.

## The separation rule

The Collective and the downstream product's commercial arrangements are
**legally and financially distinct**:

- Collective funds support **only** the open-source engine and its community.
- **Downstream product subscriptions and entitlements stay separate** — they are
  the private product's commercial concern, handled outside the Collective, and
  never mixed with Collective funds or accounting.

This keeps the open project's finances clean and independent of any commercial
product built on top of it.
