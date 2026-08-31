# Hisaar360 HMS — Accounts & Operational Flow Audit

**Date:** 2026-08-31  
**Scope:** Frontend (`hisaar360-hospital`) + Backend (`hisaar360-hospital-backend`)  
**Test hospital:** Medicare (Business Owner session)  
**Financial authority:** See `HMS_FINANCIAL_ARCHITECTURE.md` — Source docs → Encounter subledger → General Ledger

---

## Executive answers (user concerns)

| Question | Answer |
|----------|--------|
| **Flow implement kahan hua hai?** | OPD/Lab/Pharmacy/Ward operational flows exist in their modules; **financial truth** flows through `ledger.service.js` + `posting.service.js`. See sections A–D below. |
| **Accounts me kaun se options real hain?** | **Fully usable:** Trial Balance, P&L, Daily Collections, General Ledger, Doctor Performance API. **API works, UI minimal:** Dashboard, CoA, Cash/Bank Book, Receivables, Payables, Reconciliation, Journal, Expenses, Audit. **No UI:** Petty Cash, Supplier Statement, Journal reverse/detail. |
| **Test kaise karunga?** | See `docs/HMS_END_TO_END_TEST_STEPS.md` |
| **Doctor dropdown kyun nahi aa raha?** | Three causes: (1) `getDoctors()` requires `doctors.read` — **Accountant role lacks it**; Business Owner has it via Hospital Admin template. (2) Frontend sends `limit: 200` but backend max is **100** → validation error → empty list. (3) If `user` not populated, labels show MongoDB `_id`. **Fix:** dedicated `GET /accounts/report-doctors` with `accounts.reports.read`. |
| **Ledger samajh kyun nahi aa raha?** | Three layers mixed in UI: legacy Bills (`/payments/invoices`), Encounter Ledger (`/payments/ledger`), and GL (`/accounts/*`). Only **Encounter Ledger = patient balance** and **GL = hospital P&L** are authoritative. |
| **Appointment → test → pharmacy → ward → discharge → accounts?** | **Working with gaps** — see end-to-end table in Section G. |

---

## A. Appointments / OPD flow

| Step | Frontend | Backend | GL? | Status |
|------|----------|---------|-----|--------|
| Create appointment | `appointment.component.ts` | `appointment.service.js` `createAppointment` | No | ✅ |
| Set consultation fee / discount | Same | `updateAppointment` | No | ✅ |
| Mark paid at booking | `changeAppointmentPaymentStatus` | Updates `paymentStatus` only | **No auto GL** | ⚠️ Flag only; cash posts when cashier records ledger payment |
| Complete appointment | `changeAppointmentStatus` → completed | `updateAppointmentStatus` → `createEncounterFromAppointment` | Yes (on encounter open) | ✅ |
| Consultation charge on ledger | — | `encounter.service.js` → `ledger.service.js` `addLedgerItem` | Dr 1100 / Cr 4000 | ✅ |
| Cashier payment | `encounter-ledger.component.ts`, `patient-payment-detail-modal` | `recordLedgerPayment` | Dr Cash / Cr 1100 | ✅ |
| Doctor prescription | `prescription.component.ts` | `prescription.service.js` | No (clinical) | ✅ |

**How to test (UI):** `/appointments` → create → complete → `/payments/ledger` → collect payment → `/accounts/general-ledger` (4000) + `/accounts/daily-collections`.

**Gap:** Prepaid appointment does not auto-post ledger payment when encounter opens.

---

## B. Lab flow

| Step | Frontend | Backend | GL? | Status |
|------|----------|---------|-----|--------|
| Create order | `lab-order-create.component.ts` | `lab.service.js` `createLabOrder` | Via sync | ✅ |
| Legacy bill (print) | — | `syncLabBill` | **No GL** | ✅ By design |
| Encounter + ledger charge | — | `syncLabLedgerItem` | Dr 1100 / Cr 4020 | ✅ |
| Payment | `lab-order-detail.component.ts` | `syncLabLedgerPayment` / `collectLabOrderPayment` | Dr Cash / Cr 1100 | ✅ |
| Appointment fee via lab encounter | — | `syncAppointmentLedgerItemForLabEncounter` | Dr 1100 / Cr 4000 | ✅ |

**How to test:** `/laboratory/create-order` → pay → `/payments/ledger` → `/accounts/profit-loss` (laboratory line).

**Gaps:** Lab order total edit after first post may leave GL at old amount; no idempotency middleware on lab routes.

---

## C. Pharmacy flow

| Mode | Patient ledger | Sale GL | Payment GL | Status |
|------|----------------|---------|------------|--------|
| **COUNTER** | None | Dr 1110 / Cr 4030 + COGS | Dr Cash / Cr 1110 | ✅ |
| **ENCOUNTER** | `sourceType=pharmacy` via `addLedgerItem` | COGS only on sale; revenue via ledger | Cashier: Dr Cash / Cr 1100 | ✅ |

**Frontend:** `pharmacy-pos.component.ts` — `settlementMode`, `prescriptionId`, `attributedDoctorId` on checkout.

**How to test:** Rx → `/pharmacy/pos?prescriptionId=…` → COUNTER or ENCOUNTER checkout → verify ledger/GL.

**Gaps:** `convertToSale` (held→completed) skips GL; `cancelSale` no journal reversal.

---

## D. Ward / IPD flow

| Step | Frontend | Backend | Status |
|------|----------|---------|--------|
| Admission | `add-allotment`, `ward-module-page` | `room-allotment.service.js` → `createAdmissionEncounter` | ✅ |
| Advance on admit | — | BE accepts `advanceAmount`; FE does not send | ⚠️ |
| Bed charges on discharge | `alloted-rooms`, ward discharge | `applyBedCharges` → GL Cr 4010 | ✅ (fixed HMS-QA-007) |
| Ward service charges | ward activities | `completeWardActivity` → ledger | ✅ |
| IPD pharmacy | Manual ENCOUNTER POS | Same as COUNTER/ENCOUNTER | ✅ Manual |
| Discharge balance gate | — | Preview only; discharge allowed with balance | ⚠️ |
| Ward ↔ pharmacy settlement | — | **Not implemented** | ❌ No PENDING_PHARMACY_SETTLEMENT model |

**How to test:** `/room-allotment` admit → ward care → `/pharmacy/pos` ENCOUNTER → discharge → `/payments/ledger` → `/accounts/profit-loss` (roomBed).

---

## E. Accounts module — per screen audit

All routes use **one component:** `AccountsPageComponent` (`accounts-page.component.ts`).

| Screen | Route | API | Backend service | UI quality | Real data? |
|--------|-------|-----|-----------------|------------|------------|
| **Dashboard** | `/accounts/dashboard` | `GET /accounts/dashboard` | `getAccountsDashboard` | KPI tiles (partial) | ✅ Receivables/payables; ignores some backend fields |
| **CoA** | `/accounts/chart-of-accounts` | `GET /accounts/chart-of-accounts` | `listAccounts` | Generic table | ✅ |
| **GL** | `/accounts/general-ledger` | `GET /accounts/general-ledger` | `getGeneralLedger` | Summary + lines table | ✅ |
| **Journal** | `/accounts/journal` | `GET/POST /accounts/journals` | `listJournals`, `createManualJournal` | Form + generic list | ✅ Post works; no reverse UI |
| **Cash Book** | `/accounts/cash-book` | `GET /accounts/cash-book` | `getCashOrBankBook('1000')` | Lines only | ✅ No opening/closing summary bar in UI |
| **Bank Book** | `/accounts/bank-book` | `GET /accounts/bank-book` | `getCashOrBankBook('1020')` | Lines only | ✅ Not in top nav tabs |
| **Daily Collections** | `/accounts/daily-collections` | `GET /accounts/daily-collections` | `getDailyCollections` | 8 KPI cards | ✅ From GL |
| **Receivables** | `/accounts/receivables` | `GET /accounts/receivables` | `getReceivables` | Generic table | ✅ Open encounters AR |
| **Payables** | `/accounts/payables` | `GET /accounts/payables` | `getPayables` | Generic table | ✅ Supplier AP |
| **Trial Balance** | `/accounts/trial-balance` | `GET /accounts/trial-balance` | `getTrialBalance` | KPI + rows | ✅ Balanced check |
| **P&L** | `/accounts/profit-loss` | `GET /accounts/profit-loss` | `getProfitLoss` | 8 KPI cards | ✅ From GL |
| **Reconciliation** | `/accounts/reconciliation` | `GET /accounts/reconciliation` | `runReconciliation` | Findings table | ✅ |
| **Doctor Performance** | `/accounts/doctor-performance` | `GET /accounts/doctor-performance` | `doctor-performance.service.js` | Rich UI | ✅ API; **dropdown broken** (see F) |
| **Expenses** | `/accounts/expenses` | `GET /expenses` (not under /accounts) | `expense.service.js` | Generic table | ✅ Needs `expenses.read` |
| **Audit** | `/accounts/audit` | `GET /audit-logs` | audit-log service | Generic table | ✅ Needs `audit_logs.read` |

**Backend-only (no frontend route):** Petty Cash (`1010`), Supplier Statement, Expense Categories CRUD, Journal detail/reverse.

**Permission mismatches:**
- Route guard allows `accounts.read`; report APIs require `accounts.reports.read`.
- Left menu GL link requires `accounts.journals.read`; route does not.

**Patient ledger (not under /accounts):** `/payments/ledger` — Encounter Ledger UI; authoritative for patient balance.

---

## F. Doctor Performance — dropdown root cause

| # | Cause | File | Fix |
|---|-------|------|-----|
| 1 | `getDoctors()` gated on `doctors.read` | `backend.service.ts:476`, `permission.interceptor.ts`, `api-access.ts` | Add `GET /accounts/report-doctors` with `accounts.reports.read` |
| 2 | Accountant lacks `doctors.read` | `hospital-role-templates.js` Accountant block | Use report-doctors endpoint OR add read-only doctors permission to Accountant |
| 3 | `limit: 200` > max 100 | `accounts-page.component.ts:64`, `doctor.validation.js:148` | Use `limit: 100` or report-doctors without strict limit |
| 4 | Label fallback to `_id` | `doctorLabel()` | Prefer `nameUrdu`, `specialization`, populated `user.name` |
| 5 | Race: load before doctors arrive | `ngOnInit` | Await doctors before doctor-performance load |

---

## G. End-to-end flow status (Medicare / QA data)

| Flow step | Working? | Notes |
|-----------|----------|-------|
| Receptionist creates appointment | ✅ | |
| Consultation fee on encounter complete | ✅ | Not on booking alone |
| Doctor checks patient / writes Rx | ✅ | |
| Lab order + payment | ✅ | GL via ledger |
| Pharmacy ENCOUNTER sale | ✅ | COGS + ledger charge |
| Doctor advises admission | ✅ | Prescription advice field |
| Ward receptionist admits | ✅ | Separate role (`Ward Admin`) |
| Advance/security invoice | ⚠️ | BE only |
| Ward pharmacy issue | ⚠️ | Manual ENCOUNTER POS |
| Discharge + bed GL | ✅ | After HMS-QA-007 fix |
| Ward collect at discharge | ✅ | Via ledger payment |
| Pharmacy pending settlement | ❌ | Not modeled |
| Accounts Dashboard | ✅ | |
| Doctor Performance | ⚠️ | API OK; dropdown fix needed |
| TB balanced | ✅ | Per HMS-QA-003 |

---

## H. RBAC summary

| Role | Accounts full | Doctor Performance | Appointments pay | Lab pay | Pharmacy | Ward admit/discharge |
|------|---------------|-------------------|------------------|---------|----------|---------------------|
| Business Owner / Hospital Admin | ✅ | ✅ (if doctors.read) | ✅ | ✅ | ✅ | ✅ |
| Accountant | ✅ reports | ⚠️ no doctors.read | ✅ ledger | via modules | read purchases | read patients |
| Appointment Receptionist | ❌ | ❌ | ✅ appointments | ❌ | ❌ | ❌ |
| Laboratory | ❌ | ❌ | ❌ | ✅ lab | ❌ | ❌ |
| Pharmacy | ❌ | ❌ | ❌ | ❌ | ✅ sales | ❌ |
| Ward Admin / Receptionist | ❌ | ❌ | ❌ | ward orders | ENCOUNTER POS | ✅ ward/allotment |
| Doctor | ❌ | own stats only | ❌ | ❌ | ❌ | advice only |

---

## I. Known financial integrity gaps (do not ignore)

1. Appointment prepayment — no auto ledger payment  
2. Lab order amount edit — GL may stale  
3. `convertToSale` — no GL  
4. `cancelSale` — no reversal  
5. Legacy `createBill` UI — print only, not revenue  
6. Historical rows without journals — run `backfill-general-ledger` only with operator approval  
7. Ward/pharmacy discharge settlement — **not implemented**

---

## J. Implementation plan (priority order)

### P0 — This sprint
1. Fix Doctor Performance dropdown (`/accounts/report-doctors`)
2. Redesign Accounts UX (dashboard, cash/bank, doctor report) to match Hisaar360 template
3. Align route guards with `accounts.reports.read` for report screens
4. Create `HMS_END_TO_END_TEST_STEPS.md`

### P1 — Next
5. Cash/Bank book opening/closing summary in UI (data already in API response)
6. Patient-wise profitability report (`/accounts/patient-profitability`)
7. Add `doctors.read` to Accountant OR keep report-doctors only
8. Journal reverse UI

### P2 — Ward/pharmacy settlement
9. Settlement status model: UNPAID → COLLECTED_BY_WARD → PENDING_PHARMACY_SETTLEMENT → SETTLED
10. Ward advance UI on admission form
11. Discharge balance enforcement (optional config)
12. Fix `convertToSale` / `cancelSale` GL gaps

### P3 — Do not run without approval
- `npm run backfill-general-ledger` on shared DB
- `audit:financial-integrity:fix`

---

## Key files reference

| Area | Path |
|------|------|
| Accounts UI | `src/app/modules/client/accounts/accounts-page.component.*` |
| Accounts routes | `src/app/modules/client/client.routes.ts` |
| Accounts API | `backend/src/modules/accounts/accounts.routes.js` |
| GL posting | `backend/src/modules/accounts/posting.service.js` |
| Encounter ledger | `backend/src/modules/encounters/ledger.service.js` |
| Doctor performance | `backend/src/modules/accounts/doctor-performance.service.js` |
| Role templates | `backend/src/modules/roles/hospital-role-templates.js` |
| Ward billing | `backend/src/modules/ward-billing/*` |
| Ward financial workflow doc | `docs/HMS_WARD_FINANCIAL_WORKFLOW.md` |

---

## Ward / IPD (implemented 2026-08-31)

See `docs/HMS_WARD_FINANCIAL_WORKFLOW.md` for full flow. Key points:

- **Ward Receptionist** role separated from OPD Receptionist (permission-based)
- **Security deposit** posts to liability `2020`, not revenue
- **Pharmacy ward settlement** tracks internal settlement without duplicate patient payment
- **Patient profitability** uses Known Direct Cost (pharmacy COGS only) — not full net profit
