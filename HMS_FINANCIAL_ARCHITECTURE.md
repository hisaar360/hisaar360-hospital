# Hisaar360 HMS Financial Architecture

Date: 2026-08-28

## Three layers (do not mix)

1. **Source documents** describe what happened operationally: Appointment, LabOrder, RoomAllotment, Sale, Purchase, Return, Expense, Ledger Payment, Manual Charge.
2. **Patient subledger** is Encounter `ledger_items` + `ledger_payments`. This is authoritative for what a patient owes and has paid.
3. **General Ledger** is double-entry `journal_entries`. This is authoritative for hospital P&L, trial balance, cash/bank books, and financial dashboards.

A single operational event posts **once** to each applicable layer. Patient AR and GL are two representations of the same event, not two revenues.

## Authority rules

| Question | Source of truth |
| --- | --- |
| Patient receivable / statement | Encounter Ledger |
| Hospital revenue, expense, cash, equity | General Ledger |
| Lab volume | LabOrder |
| Pharmacy units sold | Sale items |
| Stock on hand | Inventory |
| Stock history | StockMovement |
| Legacy invoice print | Bill (compatibility only) |

Never compute hospital revenue as `sales + bills + encounter charges`.

## Accounting mappings

Configurable Chart of Accounts (`accounts` collection, system codes 1000–5180). Services resolve codes via `chart-of-accounts.js`, not hardcoded ObjectIds.

Typical postings:

- Consultation: Dr 1100 Patient AR / Cr 4000 Consultation Revenue
- Lab patient charge: Dr 1100 / Cr 4020 (from ledger item, **not** Bill)
- Room/bed on discharge: Dr 1100 / Cr 4010 per stay segment (`sourceType=bed`). Journal `sourceType` must include `bed` (and other ledger source types) or posting fails validation.
- Counter pharmacy sale: Dr 1110 Counter AR / Cr 4030; Dr 5000 COGS / Cr 1200 Inventory; payment Dr Cash / Cr 1110
- Encounter pharmacy sale: ledger item Dr 1100 / Cr 4030; sale posts COGS only; cashier payment Dr Cash / Cr 1100
- Purchase receive on credit: Dr 1200 / Cr 2000; payment Dr 2000 / Cr Cash
- Expense: Dr mapped expense / Cr Cash or Bank

## Duplicate prevention

- GL unique tuple on POSTED journals: `companyId + hospitalId + sourceType + sourceId + sourceEvent`
- Auto ledger charges: partial unique index on `hospitalId + sourceType + sourceId + sourceEvent` for active rows
- HTTP `X-Idempotency-Key` on payments, sales, purchases, receive, expenses, discharge, ledger charges
- Angular Save/Post/Pay buttons disable while in flight

## Reversal model

Posted amounts are never silently edited. Use VOID / CANCEL / REVERSAL / REFUND / CORRECTION. Journal status becomes `REVERSED` and a balancing reversal journal is posted. Original source documents are retained.

## Pharmacy settlement

- `COUNTER`: paid at pharmacy. No encounter charge.
- `ENCOUNTER`: requires an existing open encounter for the same patient/hospital. One `sourceType=pharmacy` ledger item. No automatic counter payment. Do not auto-create encounters.

## Lab billing

LabOrder + legacy Bill + Encounter ledger item remain for compatibility. GL revenue comes only from the ledger item (`sourceEvent=patient_charge`). Bills must not post GL revenue.

## Expense flow

Hospital-wide Expense document (scope GENERAL/ADMIN/PHARMACY/LAB/WARD/…) + GL journal + audit in one Mongo transaction. Posted edit = reverse + new expense.

## Purchase flow

DRAFT → ORDERED → PARTIALLY_RECEIVED / RECEIVED → CANCELLED. Stock and AP post on receive. Purchase returns restore/decrease inventory and reverse AP. Mounted at `/api/v1/purchases`.
