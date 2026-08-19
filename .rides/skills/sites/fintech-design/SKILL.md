---
name: fintech-design
description: FinTech design — banking dashboards, transactions, money display rules, security perception, Onboarding/KYC, cards, charts, regulatory realism. Premium trust-first UI.
---

# FinTech Design System

Money UI = trust + zero ambiguity. Conservative motion, precise numbers, security visible on every screen.

## Visual Direction
- Premium, calm, institutional-trust: deep neutral surfaces (dark or light per brand), ONE accent, generous whitespace. Prefer clean sans + tabular numbers.
- Motion: restrained (≤ 300ms fades/slides), no bouncy springs, always reduced-motion safe.

## Money Display Rules (non-negotiable)
1. **Currency**: always formatted (`$1,234.56`, ₹1,23,456.78 per locale), `tabular-nums`, sign visible (+/- for transactions), consistent decimal places.
2. Never round silently; show cents/paisa or note "rounded".
3. Amounts color-coded: credit/debit semantically (green/red in light UI; inverse carefully in dark) + sign symbol (never color-only).
4. Large sums: short format (`$1.2M`) in dashboards, full in statements.
5. **Available balance ≠ account balance** — label exactly what the number is ("Available", "Pending").

## Dashboard/Overview
- KPI cards: total balance (big), income/expense this month, savings rate — each with period label + delta.
- Primary chart: spend by category donut (≤ 6) + trend line; transactions table (date, merchant icon, category, status, amount) newest first, searchable/filterable.
- Recurring: upcoming bills card with due dates and autopay badges.

## Transactions & Statements
- Row: merchant logo/icon, name, category chip, date, amount. Detail sheet on click: full record, receipt upload, dispute/report button, merchant contact.
- Filters: date range, category, amount, status (pending/cleared/failed), export CSV/PDF statement.
- Search: merchant typo-friendly.

## Onboarding & KYC (the conversion killer — design it well)
1. ≤ 5 steps, progress bar, "save my progress" for anything legal-sensitive.
2. KYC: document upload with real-time validation feedback (approved/rejected/resubmit with reason), optional video/OTP verification.
3. Every data request explains WHY (GDPR-pattern) — reduces drop-off dramatically.
4. Test-mode markers if sandboxed: clearly labeled "Demo data" banners.

## Security Layer (visible trust)
- 2FA/MFA flows: TOTP setup with recovery codes wording ("store offline"), biometric option, session/device manager page.
- Payment authorization: confirm sheet showing masked card + amount + "Pay securely"; never redirect unexplained.
- Security center: last login, active devices (kick-out), notifications preferences, SCA compliant messaging.

## Rules
1. Errors are high-visibility: failed transaction explanation takes the blame off user where possible ("Card declined by issuer — try again or use another card").
2. Regulatory touch: terms links, T&C checkboxes explainable, data-use statements, "Money is protected" badge (as insured) IF true.
3. Identifiers masked: cards `•••• 1234`, Aadhaar/phone partial — global rule.
4. Charts honest: no truncated axes that exaggerate; savings projections labeled "estimate".
5. PDFs/receipts: print-styled, accessible text (not images).

## Checklist
- [ ] Every money figure labeled + formatted
- [ ] Track/statement export works
- [ ] Security features reachable ≤ 2 clicks
- [ ] KYC flow testable with demo/docs
- [ ] WCAG AA (transactions table readable by SR)