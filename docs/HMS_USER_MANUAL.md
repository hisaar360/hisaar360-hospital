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
- **Accounts → Rules** button: plain-language Easy Guide for Debit/Credit, Journal (balanced Debit=Credit is normal), Cash Book (Receipt vs Payment), Bank Book, Receivables, Trial Balance, P&L, and more — written for non-accountants
- **Reconciliation** (`/accounts/reconciliation`): expand findings for samples; **Post missing journals** fixes `LEDGER_MISSING_JOURNAL` / `PAYMENT_MISSING_JOURNAL`, then Apply again

## Help Center (module-based tutorials)

- Route: `/help` — Module Guides and Quick Tasks only for **enabled hospital modules** (and your role)
- Search chips such as “lab test” / “birth certificate” / “accounts rules” hide when that module is off
- New guides: **Accounts Rules — Easy Guide**, updated **Birth Certificate** (seal/signature upload + embedded View Certificate), updated **Hospital Setup** birth assets

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

Use Help Center search for: admit, room, operation, baby, birth certificate, accounts rules, invoice, ledger, pharmacy, lab, duty roster.

## Duty Roster

Mental model: **Date → Area → Shift → Coverage → Staff**.

**Multiple staff per shift:** the same ward/area, date, and Morning/Afternoon/Night can list many people. In Week view, click a shift chip to open the staff popover (green **N Staff** badge, avatar/name/role/time list, **+N more**, **View all N staff**). View all syncs the center day table to that area/shift/date.

Tree:

- Hospital → Wards → Ward → Ward Level / Room → Staff
- Departments → Staff
- OPD → Front Desk / Consultation
- Laboratory / Pharmacy (only when those modules are enabled)
- Support

Admin flow: select date, click an area, choose shift, fill an open position, save draft, then publish. **Assign Staff** / **Bulk Assign** open a 4-step drawer (Select Area → Choose Shift → Select Staff → Review). The drawer appears immediately; eligible staff are ranked from bootstrap data (no extra fan-out). **Set Coverage** if a shift has no requirement.

Patient **Assign Nurse** on Patient List is a separate bed-assignment modal. It does not load the Duty Roster tree.

Preview / PDF / Print use the shared HMS document toolbar (one Print). Staff without create/update permission see My Duty only.

Demo seed (dev/QA, Pakistani names, not CURSOR_QA display names):

```bash
cd hisaar360-hospital-backend
npm run seed:ward-roster-demo
```

## Birth certificate — View & verify

1. **Hospital Setup → Birth Certificate**: Upload seal image + Upload signature image → **Save Settings** (images are compressed)
2. Birth Records → find record → **Issue Certificate** (when verified)
3. **View Certificate** loads one payload: snapshot + embedded seal/signature/logo + QR (no extra broken `/media` calls on the SPA origin)
4. **View Record** shows metadata only
5. Preview / PDF / Print reprint the **same** certificate number and version (correction creates a new version; ordinary reprint does not)
6. Public QR opens the **landing verify form**: `https://hisaar360.com/verify/birth?certificateNo=HBC-…` (certificate number prefilled). Visitor completes Cloudflare captcha and clicks **Verify Certificate** — QR does **not** auto-open the certificate.
7. Local landing form: `http://localhost:4200/verify/birth`

## Public lab reports

1. Each patient gets a unique **Report Auth Code** (printed on lab invoice / report as Report Auth Code; File No = patient file number)
2. Public page: `https://hisaar360.com/lab-reports` — enter File No + Report Auth Code + Cloudflare captcha
3. Approved/verified lab orders are listed; View Report opens the selected result
4. Without the Report Auth Code, reports cannot be listed (prevents random file lookups)

## Doctor ne recommend kar diya — ab kya?

**Sawal:** Doctor ne patient ward mein admit karne ke liye recommend kar diya. Ab kya karna hai?

**Jawab (flow):**

1. Doctor Consultation → Admission Recommendation (patient **recommended**, not admitted)
2. Ward Reception → `/ward/admissions` → **Pending Admissions**
3. Open recommendation → **Review & Admit**
4. Select Ward → Room → Bed (+ consultant / advance if needed)
5. Confirm → Admission Encounter + occupied bed
6. Open **Patient Control Panel** for vitals, MAR, lab, pharmacy, transfer, billing, discharge

Recommendation alone creates **no** bed charge and **no** admission encounter.

For defects, provide MR No, Encounter No, receipt number, and timestamp.
