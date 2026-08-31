# Hisaar360 HMS Financial Integrity Report

Date: 2026-08-28

## Tests

Backend `npm test` (2026-08-28): **21 passed, 0 failed**.

```
npm test
```

Includes:

- `src/modules/ward/ward-access.test.js` (hospital/ward isolation, nurse role exact match)
- `src/modules/accounts/financial-invariants.test.js` (money rounding, CoA mappings, balanced journal identity, no hard-delete journal status, lab vs consultation revenue split, pharmacy settlement identities)

Angular production build: **succeeded** (`npx ng build --configuration=production`).

CLI:

```
npm run audit:financial-integrity          # dry run
npm run audit:financial-integrity:fix      # repair derived encounter summaries only
npm run backfill:general-ledger            # idempotent GL backfill
```

`--fix` recalculates Encounter totals from ledger lines/payments. It does **not** delete financial history.

Live Mongo dry-run was not executed in this session (requires the hospital replica set). Run the CLI against the deployed database to populate duplicate/orphan counts.

## Duplicate checks

Reconciliation (`GET /api/v1/accounts/reconciliation` and the CLI) reports:

- Unbalanced journals
- Duplicate source-event journals
- Encounter summary mismatches
- Missing expense journals
- Received purchases without stock movements
- Duplicate auto ledger charges (via unique indexes)

## Orphan checks

- Ledger items/payments whose encounter is missing
- Journals whose source record is missing (flagged, not auto-deleted)
- Sales without stock movements
- Returns without reversing stock movements

## Reconciliation

Authorized Accountant / Hospital Admin uses Accounts → Reconciliation. Findings are visible; they are not silently hidden.

## Existing data migration

`npm run backfill:general-ledger` posts journals from:

- Encounter ledger_items (patient charges)
- ledger_payments (receipts/refunds)
- completed Sales (pharmacy, including COGS)
- POSTED Expenses
- received Purchases

Legacy Bills are **not** posted as additional GL revenue. Unique POSTED source-event indexes make a second run create zero duplicate journals.
