# Hisaar360 HMS — End-to-End Manual Test Steps

**Environment:** `localhost:4200` + `localhost:3001/api/v1`  
**Final acceptance date:** 2026-08-31  
**Automated browser QA:** `node src/scripts/browser-ui-acceptance-qa.js` (Playwright) — **28/28 PASS**

## Final acceptance snapshot (PAT-2026-000020)

Use this patient for **read-only** UI verification. Do not add new charges/payments against it.

| Record | ID |
|--------|-----|
| Patient | PAT-2026-000020 |
| Admission | ADM-20260831-002 |
| Lab | LO-20260831-0002 |
| Medicine request | WMR-20260831-001 |
| Pharmacy sale | SAL-2026-000016 |
| Procedure | WPR-20260831-001 |
| Operation | WOT-20260831-001 (cancelled) |
| Trial Balance | 64,420 / 64,420 |

**QA users:** `qa.hospital.admin@hisaar.test`, `qa.ward.receptionist@hisaar.test`, `qa.nurse@hisaar.test`, `qa.pharmacy@hisaar.test`, `qa.accountant@hisaar.test`, `qa.appt.receptionist@hisaar.test`, `qa.laboratory@hisaar.test` (password from `QA_TEST_PASSWORD` env).

---

**Primary test login (manual):** Business Owner (`medicare@gmail.com` / Medicare hospital)

---

## Roles needed

| Role | Purpose |
|------|---------|
| Business Owner / Hospital Admin | Full accounts, all modules |
| Accountant | Accounts reports (uses `/accounts/report-doctors`) |
| Appointment Receptionist | Appointments + patient payments |
| Doctor | Prescriptions, lab advice |
| Laboratory | Lab orders + collection |
| Pharmacy | POS sales |
| Ward Receptionist | Admissions, ward billing, discharge, settlements read |

---

## 1. OPD — appointment → fee → payment

1. Login as **Appointment Receptionist** or Owner → `/appointments`
2. Create appointment for active doctor on a valid weekday slot
3. Set consultation fee; mark **Complete** (not just paid at booking)
4. Open `/payments/ledger` → find patient encounter
5. **Expected:** Consultation line on encounter ledger; GL Dr 1100 / Cr 4000
6. Record cashier payment (cash)
7. **Expected:** Ledger balance reduced; `/accounts/cash-book` shows receipt; P&L consultations line increases

---

## 2. Doctor → lab order

1. Login as **Doctor** → complete appointment → write prescription with lab tests
2. Or create lab order from `/laboratory/create-order`
3. Collect payment on lab order detail
4. **Expected:** Encounter ledger lab charge; GL Cr 4020; daily collections lab line

---

## 3. Doctor → pharmacy (ENCOUNTER)

1. From prescription → **Dispense** → `/pharmacy/pos?prescriptionId=…`
2. Choose **ENCOUNTER** settlement, select open encounter, checkout
3. **Expected:** Sale COGS GL; encounter pharmacy charge; no counter AR
4. Cashier pays at `/payments/ledger`
5. **Expected:** Dr Cash / Cr 1100

---

## 4. Pharmacy COUNTER

1. `/pharmacy/pos` → COUNTER mode → complete sale with register open
2. **Expected:** GL Dr 1110 / Cr 4030 + COGS; cash book movement

---

## 5. Ward admission → discharge

1. Login **Ward Admin** → `/room-allotment` or `/ward/admissions`
2. Admit patient to vacant room
3. **Expected:** Admission encounter created
4. Optional: ENCOUNTER pharmacy sale while admitted
5. Discharge from `/room-allotment/alloted-rooms`
6. **Expected:** Bed charge lines (4010 revenue); encounter may still show balance until paid
7. Pay at `/payments/ledger`
8. **Expected:** P&L `roomBed` includes bed charges; TB balanced

---

## 6. Accounts Dashboard

1. Owner → `/accounts/dashboard`
2. **Expected:** Receivables, Payables, Open AR, Trial balanced KPI cards
3. Shortcuts to GL, Cash, Bank, Collections, Reconciliation

---

## 7. Cash Book / Bank Book

1. `/accounts/cash-book` → set date range → Apply
2. **Expected:** Opening / debit / credit / closing summary + transaction lines
3. Repeat for `/accounts/bank-book` (bank-method payments only)

---

## 8. Trial Balance & P&L

1. `/accounts/trial-balance` → **Expected:** Total debit = total credit
2. `/accounts/profit-loss` → **Expected:** Revenue/expense from GL only

---

## 9. Doctor Performance

1. `/accounts/doctor-performance` (standalone `DoctorPerformancePageComponent`)
2. **Expected:** Page loads without hang; doctor dropdown populated via `/accounts/report-doctors` (human names, not Mongo IDs)
3. Select doctor → This Month → Apply
4. **Expected:** Consultation fees, lab, pharmacy KPIs; breakdown tabs; detail tables
5. **Automated:** Accountant browser role — **PASS** (2026-08-31)

---

## 10. Reconciliation

1. `/accounts/reconciliation` → Apply
2. **Expected:** Findings list (unbalanced journals, orphans, etc.) — not hidden

---

## 11. Permission checks

| User | Should see | Should NOT see |
|------|------------|----------------|
| Receptionist | Appointments, Payments | `/accounts/profit-loss` |
| Lab user | Laboratory | Full accounts |
| Pharmacy | Pharmacy POS | Trial Balance |
| Accountant | All accounts reports | — |
| Doctor | Own dashboard | Accounts module |

---

## 12. IPD admission (Ward Receptionist)

1. Login as **Ward Receptionist** or Owner → `/room-allotment/add-alloted-rooms`
2. Search QA patient → select room/bed → enter advance + security deposit → Save
3. Open `/ward/patient-detail/:admissionId` → **Billing** / **Payments** tabs
4. **Expected:** Running bill summary; security held as liability (not revenue); admission number shown

## 13. Ward pharmacy issue

1. Pharmacy POS → Encounter mode → select admitted QA patient encounter
2. Issue medicine → complete sale
3. Ward patient detail → **Medicines** tab
4. **Expected:** One pharmacy charge on running bill; inventory decreased once

## 14. Ward discharge + pharmacy settlement

1. Ward Receptionist → collect final payment on **Payments** tab (balance → 0)
2. **Settlement** tab → pharmacy rows `PENDING_SETTLEMENT`, patient `PAID`
3. Login **Pharmacy** → `/pharmacy/ward-settlements` → Verify/Settle
4. **Expected:** Status `SETTLED`; no duplicate patient payment or GL revenue

## 15. Doctor ward visit

1. Ward patient detail → **Doctor Visits** → schedule + complete chargeable visit
2. **Expected:** One doctor visit charge on billing tab; GL once

## 16. Patient profitability

1. Login Accountant/Owner → `/accounts/patient-profitability`
2. **Expected:** Encounter rows with Gross Patient Revenue, Known Direct Cost, Gross Contribution

## 17. Ward duty roster

1. `/ward/duty-roster` → add shift for staff user
2. **Expected:** Shift persisted; filter by date/ward works

---

## Known gaps (not failures)

- Appointment **prepaid at booking** does not auto-post cash GL
- Legacy **Bills** (`/payments/invoices`) are print-only — not GL revenue
- Historical rows may lack journals until approved backfill
- Doctor cost, lab reagent cost, staff cost **not** tracked — profitability shows **Known Direct Cost** only

---

## Test data (Medicare)

- Doctors include **Dr Ahmad**, Dr. Ali Raza, etc.
- QA patients: `CURSOR_QA_*` from prior QA runs
- Paid appointments, lab orders, pharmacy sales exist in DB

**Do not run** `backfill-general-ledger` or `audit:financial-integrity:fix` on shared DB without explicit approval.
