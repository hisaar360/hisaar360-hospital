# HMS Ward / IPD Financial Workflow

## Overview

IPD financial flow follows:

**Operational Source Document → Encounter Patient Subledger → General Ledger exactly once**

Ward Receptionist is separate from OPD Receptionist. Permissions control access — not role names alone.

## Roles

| Role | Scope |
|------|--------|
| Receptionist (OPD) | Patients, appointments, OPD collections — **no** ward admissions by default |
| Ward Receptionist | Admissions, ward billing, collections, discharge, settlement visibility |
| Pharmacy | Ward settlements verify — **no** full accounts by default |
| Accountant / Business Owner | Patient profitability, GL, TB, P&L when permitted |

## Admission Flow

1. Doctor recommends admission (`POST /ward-billing/admission-recommendations`) — does **not** allocate bed
2. Ward Receptionist creates admission (`POST /room-allotments`) with bed/room, advance, security
3. System generates `admissionNo` (ADM…) and admission encounter
4. Advance → ledger payment type `advance` (Dr Cash / Cr AR)
5. Security → ledger payment type `security_deposit` (Dr Cash / Cr **2020 Patient Deposits** — liability, not revenue)

## Running Bill

`GET /ward-billing/admissions/:id/bill` returns:

- Ledger charges (room, lab, pharmacy, doctor visits, procedures, misc)
- Payments (advance, partial, final, security types)
- Summary: totalCharges, paid, securityHeld, balance, pendingPharmacySettlement

## Security / Deposit Accounting

| Event | GL |
|-------|-----|
| Collect security | Dr Cash / Cr 2020 Patient Deposits |
| Apply on discharge | Dr 2020 / Cr 1100 Patient AR |
| Refund security | Dr 2020 / Cr Cash |

Security is **never** posted to revenue accounts.

## Ward Pharmacy + Internal Settlement

1. Pharmacy issues to admitted patient via POS **Encounter** mode → one sale, one inventory decrease, one ledger pharmacy charge, one revenue + COGS GL
2. On ward final/partial payment when patient balance = 0 → `PharmacyWardSettlement` records created as `PENDING_SETTLEMENT`
3. Pharmacy verifies at `/pharmacy/ward-settlements` → status `SETTLED`
4. **No** duplicate patient payment or revenue on settlement verify

Settlement statuses: `UNPAID`, `COLLECTED_EXTERNALLY`, `PENDING_SETTLEMENT`, `SETTLED`

## Patient Profitability

`GET /accounts/patient-profitability` (permission: `accounts.patient_profitability.read`)

- **Gross Patient Revenue** — sum of encounter ledger charges by category
- **Known Direct Cost** — pharmacy COGS from sale item unit costs only
- **Gross Contribution** — revenue minus known direct cost (not net profit)
- Encounter-level drill-down with collected / outstanding

## UI Routes

| Page | Route |
|------|-------|
| Ward patient billing tabs | `/ward/patient-detail/:admissionId` |
| Add admission (advance/security) | `/room-allotment/add-alloted-rooms` |
| Pharmacy ward settlements | `/pharmacy/ward-settlements` |
| Ward duty roster | `/ward/duty-roster` |
| Patient profitability | `/accounts/patient-profitability` |

## Models Added

- `admission_recommendations`
- `pharmacy_ward_settlements`
- `ward_doctor_visits`
- `ward_duty_rosters`
- Extended: `room_allotments`, `ledger_payments`, `encounters.summary`
