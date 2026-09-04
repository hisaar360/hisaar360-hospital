# Hisaar360 HMS User Manual

This manual mirrors the in-app **Help Center** at `/help`. Prefer the Help Center for searchable, up-to-date guides.

## Quick links

| Topic | Route |
|-------|--------|
| Help Center | `/help` |
| Patients | `/all-patients`, `/add-patient` |
| Appointments | `/appointments` |
| Prescriptions | `/prescriptions` |
| Ward Admissions | `/ward/admissions` |
| Bed Management | `/ward/bed-management` |
| Patient Ledger | `/payments/ledger` |
| Accounts | `/accounts/dashboard` |
| Department Report | `/accounts/department-performance` |
| Nursery | `/ward/nursery` |
| Birth Records | `/ward/nursery/birth-records` |
| Duty Roster | `/ward/duty-roster` |
| Public certificate verify | `/verify/birth/:code` |

## Core workflow

1. **Register patient** → `/add-patient`
2. **Book appointment** → `/appointments`
3. **Doctor consultation** → `/prescriptions` (optional **Recommend Admission** — no bed allocated yet)
4. **Ward reception admit** → `/ward/admissions` (select ward/room/bed → creates RoomAllotment + admission Encounter)
5. **IPD care** → vitals, MAR, lab, pharmacy, procedures via ward modules
6. **Running bill & discharge** → patient detail → collect payment → discharge → final statement
7. **Accounts** → ledger, GL, trial balance, department performance

## Department ≠ Ward ≠ Room ≠ Bed

- **Department** — clinical specialty (Cardiology, Gynae, etc.)
- **Ward** — physical care unit
- **Room** — room within ward (optional floor)
- **Bed/Cot** — allocatable unit

Doctor **recommends** admission; Ward Receptionist **allocates** room/bed.

## Maternity & newborn

1. Admit mother to maternity ward
2. Complete operation/delivery (revenue on COMPLETED only)
3. **Record Birth** → `/ward/nursery/birth-records`
4. Baby gets **separate** MR, Patient, Encounter
5. Nursery cot allocation → `/ward/nursery`
6. Baby services bill to **baby encounter**, not mother
7. Birth certificate → verify → public QR at `/verify/birth/:code`
8. Mother and baby **discharge independently**

## Financial rules

- Central chain: **Encounter → ledger_items → ledger_payments → GL**
- Do not double-count legacy Bill + ledger + GL
- Admission recommendation alone: **no charge**
- Operation SCHEDULED: **no revenue**; COMPLETED: one charge + one GL event
- Security/advance: payment, not revenue

## Department Performance report

`/accounts/department-performance` — filter by date, department, doctor, OPD/IPD, source, payment status. Export Excel or Print/PDF.

## Unified Preview / PDF / Print (2026-09-02)

Most financial and clinical documents now use the same **Preview → PDF → Print** toolbar:

- **Preview** opens an A4 document modal (sticky actions on mobile)
- **PDF** downloads true A4 output (same HTML template)
- **Print** prints document content only (no sidebar/nav/buttons)

### Where to find exports

| Module | Documents |
|--------|-----------|
| Accounts | GL, Journal, Cash/Bank books, Receivables/Payables, Collections, Trial Balance, P&L, Audit, Reconciliation, Patient Profitability, CoA |
| Payments | Patient Ledger, **Payment Receipt** (select payment row) |
| Invoices | **Invoice detail** (`/payments/invoices/invoice-detail/:id`) |
| Laboratory | Verified lab report |
| Prescription | Admission recommendation |
| Ward | MAR sheet, patient summary, vitals, procedures, imaging order, running bill, discharge statement |
| Birth records | Birth certificate (reprint keeps same certificate version) |

### Nursery demo data (development/QA)

```bash
cd hisaar360-hospital-backend
npm run seed:nursery-demo
```

Creates idempotent demo mother `CURSOR_QA_NURSERY_MOTHER`, baby `CURSOR_QA_BABY_DEMO`, birth record, one active certificate, feeding, and vitals. Public verification returns **VALID**.

## Support

Use Help Center search for: admit, room, operation, baby, birth certificate, invoice, ledger, pharmacy, lab, duty roster.

## Duty Roster

Mental model: **Date → Area → Shift → Coverage → Staff**.

Tree:

- Hospital → Wards → Ward → Ward Level / Room → Staff
- Departments → Staff
- OPD → Front Desk / Consultation
- Laboratory / Pharmacy (only when those modules are enabled)
- Support

Admin flow: select date, click an area, choose shift, fill an open position, save draft, then publish. **Assign Staff** / **Bulk Assign** open a 4-step drawer (Select Area → Choose Shift → Select Staff → Review). The drawer appears immediately; eligible staff are ranked from bootstrap data (no extra fan-out). **Set Coverage** if a shift has no requirement.

Patient **Assign Nurse** on Patient List is a separate bed-assignment modal. It does not load the Duty Roster tree.

Preview / PDF / Print use the shared HMS document toolbar (one Print). Staff without create/update permission see My Duty only.

For defects, provide MR No, Encounter No, receipt number, and timestamp.
