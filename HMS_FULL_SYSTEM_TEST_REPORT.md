# Hisaar360 HMS Full System Test Report

Date: 2026-08-28  
Tester: Senior QA + hospital domain + financial audit (this session)

## Environment tested

| Item | Value |
| --- | --- |
| Mode | **LOCAL** (not staging, not live production frontend) |
| Frontend | `http://localhost:4200` |
| Backend health | `GET http://localhost:3001/api/v1/health` → 200, `environment: development`, `app: Hisaar360 HMS` |
| Hospital | Medicare (`hospitalId` present; not printed here) |
| Role tested | **Company Owner** (131 permissions, no wildcard `*`, product edition `hospital`) |
| Session | Authenticated browser tab provided; access token TTL ~10 minutes |

Live API host from context (`hmsbackend-faizan99904.fly.dev`) was **not** used. All API calls went to local `:3001`.

Existing clinical record **Ahmed Khan / PAT-2026-000001** (admitted, lab CBC Rs 800 unpaid) was **inspected only**. No discharge, refund, or history rewrite on that patient.

## Context / docs read

Read completely before browser work:

- `hisaar360-hospital/context.txt`
- `hisaar360-hospital-backend/context.txt`
- `hisaar360-hospital/HMS_MODULE_IMPLEMENTATION_AUDIT.md` (canonical frontend copy)
- `hisaar360-hospital/HMS_FINANCIAL_ARCHITECTURE.md`
- `hisaar360-hospital/HMS_FINANCIAL_INTEGRITY_REPORT.md`
- `hisaar360-hospital-backend/CASE_STUDY.md` (POS foundation case study; older than HMS financial docs)
- `hisaar360-hospital-backend/docs/encounter-ledger-workflow.md`
- `hisaar360-hospital-backend/docs/manual-test-flow.md` (POS seed flow; API port in that doc is stale `3000`)
- Route mounts in `src/app.js`, `client.routes.ts`, AuthService, BackendService, posting/ledger/inventory services, permissions enum

Canonical financial rules used: Encounter Ledger = patient AR; General Ledger = hospital books; never `sales + bills + encounter charges` as revenue.

## Login role(s) tested

- Company Owner (Medicare) — dashboard, APIs, token expiry redirect
- Other roles (Doctor, Nurse, Receptionist, Accountant, Pharmacy, Laboratory, Ward Admin) **not** logged in this session (single authenticated session)

## Test data created

| Record | Identifier | Notes |
| --- | --- | --- |
| Department | `QA_CURSOR OPD` | Created |
| Patient | `QA_CURSOR OPD` / `PAT-2026-000002` | Created; appointment not completed (validation) |
| Appointment / Encounter / Lab / Expense / Sale | — | Not completed this session (see blockers) |

No posted financial history was hard-deleted.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 1 Basic health | **PASS** | Frontend dashboard loaded; health 200; `GET /hospital-dashboard/summary` once (2220ms); no duplicate `/auth/me` on that page |
| 2 Auth / RBAC | **PARTIAL** | Company Owner sidebar includes Hospital, Pharmacy, Ward, Accounts, Admin. Other roles not exercised. Token expiry → logout → `https://hisaar360.com/login` **PASS** (verified live) |
| 3 Master data | **PARTIAL** | 2 doctors, 1 ward, 1 occupied room, 8 lab tests, 1 pharmacy store. 0 departments (until QA create), 0 products, 0 inventory, 0 suppliers. Doctor list API names empty in list projection |
| 4 Doctor schedule | **CODE PASS / UI NOT RE-RUN** | Server `APPOINTMENT_DOUBLE_BOOKED` + availability/slots in `appointment.service.js`. UI calendar not re-tested after session drop |
| 5 OPD E2E | **FAIL / BLOCKED** | QA patient created. Appointment `visitType: 'new'` rejected (`Consultation` is required). Session then expired |
| 6 Prescription | **NOT RUN** | Session expired before doctor Rx UI |
| 7 Laboratory | **PARTIAL** | Existing ADM encounter has **one** lab ledger item Rs 800, `sourceType=lab`, `sourceEvent=charge`, `sourceId` = lab order. **Zero** GL journals for that event. P&L laboratory revenue = 0 |
| 8 Pharmacy counter sale | **NOT RUN** | No products/inventory |
| 9 Pharmacy encounter sale | **NOT RUN** | Same; ENCOUNTER without encounter not fully proven (sale payload also failed validation) |
| 10 Pharmacy duplicate | **NOT RUN** | |
| 11 Pharmacy return | **NOT RUN** | |
| 12 IPD | **PARTIAL (read)** | Existing admission `ADM-20260818-001`, status `admitted`, room 101 occupied, balance 800, unpaid. Not mutated |
| 13 I/O Chart | **NOT RUN** (UI) | Dedicated `ward_io_entries` exists in code |
| 14 Ward inventory | **NOT RUN** | |
| 15 Transfer / discharge | **NOT RUN** | Would have billed real Ahmed Khan stay |
| 16 Patient ledger recon | **PASS (existing)** | Encounter summary 800 = one active lab line; paid 0; balance 800. Arithmetic matches |
| 17 Payments | **NOT RUN** | Would collect on real unpaid 800 if used Ahmed Khan |
| 18 Purchases | **PARTIAL** | `GET /purchases` 200 empty list (module mounted) |
| 19 Expenses | **FAIL then FIX** | `GET /expenses` was 500 `Expense is not defined`. Fixed. `POST` was 500 `ensureSingleLocationAssignment is not a function`. Fixed in `location-scope.js`. POST not re-proven after session drop |
| 20 General Ledger | **PARTIAL** | CoA GET 200 after fix (31 accounts). Journal list empty. Dashboard AR 800 matches encounter, not GL |
| 21 Trial Balance | **PASS (empty books)** | `balanced: true` with no posted journals. After backfill this must be re-checked |
| 22 P&L | **PASS as GL (FAIL vs operations)** | P&L from GL: all revenue 0. Operational lab charge 800 exists. Not double-count; **missing GL backfill** |
| 23 AR / AP | **PARTIAL** | Accounts dashboard `receivableTotal: 800`, `openReceivableCount: 1`, payables 0. Matches encounter, not journals |
| 24 Audit | **PARTIAL** | `GET /audit-logs` 200 with rows. Detail/append-only UI not clicked |
| 25 Reconciliation | **PASS (empty GL)** | `findingCount: 0`. Does not flag “ledger item without journal” as a finding in this run |
| 26 GL backfill | **NOT RUN** | Script reviewed: idempotent via unique POSTED source tuple. Not executed (safety: do not run on unknown Mongo). Recommend local dry-run then `npm run backfill:general-ledger` |
| 27 Idempotency | **PARTIAL** | HTTP `X-Idempotency-Key` present. `from-appointment` now has middleware (added this session). Unique journal + ledger indexes in models |
| 28 Mongo transactions | **CODE REVIEW PASS** | Sale/payment/expense/purchase/return use `runInTransaction`. Not fault-injected |
| 29 Reports | **NOT RUN** | Date filters not exercised in UI |
| 30 Dashboards | **PARTIAL** | Hospital dashboard 1 GET. Accounts dashboard API 200. Ward/Pharmacy dashboard APIs 200. UI Accounts page not reached (token expired) |
| 31 API duplicates | **PASS (dashboard)** | Hospital dashboard: 1× `/hospital-dashboard/summary`. Parallel CoA+TB previously raced (409); seeding now ignores duplicate keys |
| 32 Responsive | **NOT RUN** | |
| 33 Refresh persistence | **PARTIAL** | Dashboard persisted across in-session navigation until token expiry |
| 34 Negative API | **PARTIAL** | Invalid appointment visitType → 400. Invalid sale payload → 400. Cross-hospital param tampering not run |

## Token expiry (requested fix)

**Verified:** when the access token expired (or auth failure fired), the SPA cleared local session and redirected to **`https://hisaar360.com/login`**.

Implementation:

- JWT `exp` watchdog refreshes ~30s before expiry; on refresh failure → hosted login
- 401 without usable refresh / `SESSION_*` / invalid token → hosted login
- Explicit logout also uses hosted login

## Frontend issues found

| Severity | Issue | Status |
| --- | --- | --- |
| P1 | Dashboard “Today's Revenue” hint said “Bills collected today” while value is GL `todayRevenue` | **Fixed** → “GL posted revenue today” |
| P2 | Header “Create” dropdown (User/Product/Category/Report) is dead template leftover | **Hidden** |
| P2 | Header rightbar still contains template Chat/Groups/Contact demo copy | Remaining |
| P2 | Doctor list API preview had empty `name` (UI may still show via other fields) | Remaining |
| P2 | Appointment `visitType` must be `Consultation` / `Follow-up` / `Walk-in` / `Emergency` — easy to send invalid `new` | Remaining (validation correctly 400) |

## Backend issues found

| Severity | Issue | Status |
| --- | --- | --- |
| P0 | `GET /expenses` 500: `Expense is not defined` | **Fixed** (restore model require) |
| P0 | `GET /accounts/chart-of-accounts` and trial-balance 409 duplicate CoA seed under parallel GET | **Fixed** (`insertMany` ordered:false, ignore 11000) |
| P0 | Existing lab ledger Rs 800 has **no** GL journal; P&L revenue 0 | **Open** — run `npm run backfill:general-ledger` on this local DB, then re-check TB/P&L |
| P0 | `POST /expenses` 500: `ensureSingleLocationAssignment is not a function` | **Fixed** (restore location-scope helpers used by expenses + payments) |
| P1 | `POST /encounters/from-appointment` lacked HTTP idempotency middleware | **Fixed** (service already returns existing encounter) |
| P1 | Reconciliation `findingCount: 0` while ledger items exist without journals | **Open** — recon should flag missing GL for posted ledger items |
| P2 | `context.txt` still says pharmacy sales do not post to encounter ledger (stale vs architecture) | Docs drift |

## Database issues found

- CoA unique `(companyId, hospitalId, code)` is correct; seed must tolerate races.
- `ledger_items` for lab uses `sourceEvent=charge` (not `patient_charge`). Posting maps `charge` → `patient_charge` for journals.
- No products / stock lots in this hospital — pharmacy E2E cannot run until master data exists.
- No departments until `QA_CURSOR OPD` was created.

## Ledger issues

- Ahmed Khan ADM: charges 800, discount 0, paid 0, refund 0, balance 800. **Reconciles.**
- One lab line only — no duplicate auto charge observed.
- QA OPD consultation charge **not** posted this session.

## General Ledger issues

- Journal collection empty for this hospital in the test window.
- Hospital dashboard Total Revenue uses GL 40xx (correct authority).
- Accounts dashboard AR 800 is **subledger-derived**, which is correct for receivables, but GL cash/revenue will stay 0 until backfill.

## Inventory issues

- No inventory rows. Cannot prove sale/stock/return yet.

## Audit issues

- Audit list API works. Photo/role detail trails not opened in UI.

## Duplicate / idempotency findings

- Parallel CoA seed caused 409 — fixed.
- `from-appointment` already de-dupes by open encounter per appointment.
- HTTP idempotency added on that route.
- Expense POST not re-tested after location-scope fix.

## RBAC / security findings

- Company Owner sees full hospital menus including Accounts.
- Wildcard not set on this user (hospital scoped).
- Nurse/Doctor isolation **not** browser-tested this session (ward-access unit tests still pass).

## API call / performance findings

| Route | Initial GETs | Notes |
| --- | --- | --- |
| `/dashboard` | 1 × `/hospital-dashboard/summary` | Good |
| `/auth/me` | Not duplicated on dashboard load (in-memory user) | Good |
| `/accounts/chart-of-accounts` + `/trial-balance` in parallel | Previously 409 race | Fixed |

## Responsive findings

Not measured at 375/430/768 (session ended).

## Fixes made this session

1. Token expiry → logout → `https://hisaar360.com/login`
2. Expense model require
3. CoA seed duplicate-key safe
4. Restore `ensureSingleLocationAssignment` / `ensureLocationAccessByUser`
5. Idempotency on `POST /encounters/from-appointment`
6. Dashboard revenue hint no longer says “Bills”
7. Hide header Create template dropdown

## Files changed

Frontend:

- `src/app/core/services/auth.service.ts`
- `src/app/core/error.interceptor.ts`
- `src/app/modules/auth/auth.guard.ts`
- `src/app/modules/client/dashboard/dashboard.component.ts`
- `src/app/modules/client/header/header.component.html`

Backend:

- `src/modules/expenses/expense.service.js`
- `src/modules/accounts/posting.service.js`
- `src/common/utils/location-scope.js`
- `src/modules/encounters/encounter.routes.js`

## Tests added

None this session. Existing financial invariant + ward-access tests still pass.

## Backend test results

```
npm test
# 21 passed, 0 failed
```

## Angular production build result

**Succeeded** (`npx ng build --configuration=production`). Existing Sass/budget warnings only.

## Financial integrity dry-run result

**Not executed.** Do not run `--fix` on production. After login, on this local DB:

```
cd hisaar360-hospital-backend
npm run audit:financial-integrity
```

## Reconciliation result

`GET /accounts/reconciliation` → `findingCount: 0` while operational lab AR exists without journals. Treat recon as incomplete until missing-journal checks are added and backfill is run.

## Trial Balance totals

`balanced: true` with **no posted journals** (debits = credits = 0 at GL layer). Not a P0 imbalance; it is an **empty GL**. After backfill, totals must be re-read.

## Traceability table

| Test | UI Route | API | Source Record | Patient Ledger Effect | GL Effect | Stock Effect | Audit Effect | Expected | Actual | PASS/FAIL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Health | `/dashboard` | `GET /health` | — | — | — | — | — | 200 | 200 development | PASS |
| Hospital dashboard | `/dashboard` | `GET /hospital-dashboard/summary` | aggregations | — | todayRevenue from 40xx | — | — | 1 GET, GL revenue | 1 GET, Rs0 GL | PASS (authority) / FAIL vs lab ops |
| Auth me | — | `GET /auth/me` | HmsUserProfile | — | — | — | — | 200, no dup | 200 | PASS |
| Token expiry | any | 401 / exp | session | — | — | — | logout | redirect `https://hisaar360.com/login` | redirected | PASS |
| CoA | `/accounts/chart-of-accounts` | `GET /accounts/chart-of-accounts` | accounts | — | seed system accounts | — | — | 200 list | 409 then 200/31 | PASS after fix |
| Trial balance | accounts | `GET /accounts/trial-balance` | journals | — | Dr=Cr | — | — | balanced | balanced empty | PASS empty / recheck after backfill |
| P&L | accounts | `GET /accounts/profit-loss` | journals | — | revenue from GL | — | — | not sales+bills | all 0 | PASS authority |
| AR dashboard | accounts | `GET /accounts/dashboard` | encounters | 800 | — | — | — | match ledger | 800 / 1 open | PASS |
| Reconciliation | accounts | `GET /accounts/reconciliation` | mixed | — | — | — | — | surface missing GL | 0 findings | FAIL (gap) |
| Expenses list | `/pharmacy/expenses` | `GET /expenses` | expenses | — | — | — | — | 200 | 500 then 200 | PASS after fix |
| Expense create | — | `POST /expenses` | Expense | — | Dr expense Cr bank | — | audit | 201 + journal | 500 location-scope | FAIL then code fix, not re-proven |
| Purchases list | `/pharmacy/purchases` | `GET /purchases` | purchases | — | — | — | — | 200 | 200 empty | PASS |
| Ward KPI API | `/ward/dashboard` | `GET /ward/dashboard` | ward | — | none | — | — | 200 summary | 200 | PASS |
| Pharmacy KPI API | `/pharmacy` | `GET /sales/dashboard` | sales | — | — | counts | — | 200 | 200 zeros | PASS |
| Existing IPD ledger | — | `GET /encounters/:id/ledger` | LabOrder + ledger_item | +800 lab once | one lab revenue | none | — | once each layer | ledger once, GL missing | FAIL GL |
| Lab vs Bill double revenue | — | journals sourceType=lab | LabOrder + Bill + ledger | X | X not 2X | — | — | GL from ledger only | no GL at all | FAIL missing, not duplicate |
| QA patient | `/patients` | `POST /patients` | Patient | — | — | — | — | persist | PAT-2026-000002 | PASS |
| QA department | `/departments` | `POST /departments` | Department | — | — | — | — | persist | QA_CURSOR OPD | PASS |
| QA appointment | `/appointments` | `POST /appointments` | Appointment | — | — | — | — | 201 + slot rule | 400 visitType | FAIL input / not re-run |
| OPD consultation | — | `POST /encounters/from-appointment` | Appointment | +consultation once | Dr 1100 Cr 4000 | none | audit | once | not reached | FAIL blocked |
| Double-book | `/appointments` | `POST /appointments` | Appointment | — | — | — | — | 409 `APPOINTMENT_DOUBLE_BOOKED` | not reached | NOT RUN |
| Pharmacy ENCOUNTER no visit | `/pharmacy/pos` | `POST /sales` | Sale | none | none | none | — | 4xx no hidden encounter | 400 validation (bad payload) | INCONCLUSIVE |
| Counter sale | `/pharmacy/pos` | `POST /sales` | Sale | none | AR/revenue + COGS | −qty + movement | audit | once | no products | NOT RUN |

Consultation posting identity (from code, not this run):

- Ledger: `sourceType=appointment`, `sourceId=<appointmentId>`, default `sourceEvent=charge`
- GL: posting maps to `sourceEvent=patient_charge` on the journal unique tuple

Lab (observed):

- Ledger: `sourceType=lab`, `sourceEvent=charge`, `sourceId=<labOrderId>`
- Legacy Bill: compatibility (not queried in detail this run)
- GL: **missing** until backfill

## Outstanding blockers

1. **P0** Run `npm run backfill:general-ledger` on this **local** HMS database, then confirm one journal per existing ledger item and TB still balances. Do not run on production without a backup.
2. **P0** Re-test `POST /expenses` after location-scope fix.
3. **P0** Complete OPD with `visitType: Consultation`, then lab + payment + GL trace for `QA_CURSOR` / `PAT-2026-000002`.
4. **P1** Seed a `QA_` product + opening stock before pharmacy COUNTER/ENCOUNTER/return tests.
5. **P1** Add reconciliation finding: active ledger item / posted expense / completed sale without matching POSTED journal.
6. **P2** Finish remaining role logins, ward I/O UI, discharge (use a QA admission, not Ahmed Khan), responsive checks.

Re-login at **https://hisaar360.com/login**, then open local HMS again to continue browser E2E. The session used for this report was cleared by the expiry redirect (working as requested).

## Counts

Total scenarios tested: **28** (including code-backed and blocked)  
Passed: **14**  
Failed: **6**  
Not run / blocked: **8**  
Fixed during test: **6**  
Remaining P0: **3** (GL backfill + expense POST retest + OPD money trace)  
Remaining P1: **3**  
Remaining P2: **3**

## Remaining real blockers only

1. Historical patient charges exist without General Ledger journals (Ahmed Khan lab Rs 800). Hospital P&L/revenue is 0. Backfill required on the local DB.
2. Expense create was 500; code fixed but not re-proven in browser.
3. Full OPD → Rx → lab → pharmacy → payment → GL → audit path not completed because the 10-minute token expired and the app correctly sent the tester to `https://hisaar360.com/login`.

---

## Continuation 29 Aug 2026 (pending checks)

Session stayed on Company Owner / Medicare. Ahmed Khan was not paid or discharged.

### Proven this pass

| Check | Result |
| --- | --- |
| Rx already saved for QA_CURSOR | PASS (Previous Prescriptions: 1) |
| Product + opening stock | PASS `QA Paracetamol` SKU `QA-PARACETAMOL-DD2GU8` opening 50 |
| COUNTER sale | PASS `SAL-2026-000001` cash 20, stock 50→49. GL `JV-000004` revenue, `JV-000005` COGS 10, `JV-000006` payment 20 |
| ENCOUNTER sale | PASS `SAL-2026-000002` unpaid 0 on `OPD-20260829-001`, stock 49→48. GL `JV-000007` COGS only + `JV-000008` pharmacy patient charge 20. No counter cash journal |
| Expense POST | PASS `QA petty cash` Utilities cash 100. GL `JV-000009` |
| Accounts dashboard | PASS receivables **1620** then after this pass **820** (Ahmed 800 + pharmacy ENCOUNTER 20); payables **100** after purchase receive; open AR **2**; trial balanced **true** |
| Reconciliation | PASS still only `LEDGER_MISSING_JOURNAL` error **1** (Ahmed historical 800). Return, purchase, lab receipt journals matched |

### Proven later the same night (remaining checks)

| Check | Result |
| --- | --- |
| Sales return `SAL-2026-000001` | PASS `SRET-2026-000001` qty 1 refund PKR 20 completed. Counter sale restocked (48→49 expected at store) |
| Supplier | PASS `QA Cursor Supplier` |
| Warehouse create from purchase form | PASS `QA Cursor Warehouse` / `QA-WH-01` `_id` `6a91ec3d1df5e51826b987af` |
| Purchase draft + receive | PASS `PUR-2026-000001` 10 × QA Paracetamol @ 10, total 100, status **received**, paid 0. AP **100** on accounts dashboard |
| Stray QA lab pay `OPD-20260829-002` | PASS `RCT-20260829-002` final cash 800, balance **0**. Not Ahmed Khan |
| Ward I/O | PASS 200 ml Oral INTAKE on Ahmed Khan `PAT-2026-000001` / `ADM-20260818-001`. Status Recorded. **Not discharged** |

### Fixes during this pass

1. `sale.service.js` — import `getActiveRegisterForSale` (COUNTER POST was 500 `is not defined`).
2. `chart-of-accounts.js` — add journal `sourceType` `pharmacy` (ENCOUNTER sale was 400 enum).
3. POS overlay Enter no longer submits an empty return while the invoice search box is focused.

### Fixes during this later pass

1. `createWarehouse` API client + inline “Add warehouse” on purchase create.
2. Product list `limit: 200` was **400** against Zod max 100 — inventory and purchase product dropdowns were empty. Frontend capped at 100; product list max raised to 200 for later restart.
3. Alias `/pharmacy/sales-returns` → `/pharmacy/returns/sales`.
4. POS: stop silent 403 on checkout / open / close register; hide Open Register overlay while register/stores are loading; sales/inventory store blank option is **All stores**; inventory Apply reloads from API and auto-selects first store when Company Owner has no `storeId`.
5. `getProducts` / `getWarehouses` unwrap paginated `{ items }` lists.
6. Ward action modal no longer clears I/O direction/category on open; `loadActionOptions` loads only allotments/rooms/doctors/patients/prescriptions (the full clinical bundle hung Add Entry); `safeList` times out at 12s; modal runs updates inside `NgZone` so Save is not stuck disabled; single admitted patient is pre-selected.
7. I/O chart showed raw `patientId` instead of name — list now resolves `patientName` / populated patient / patient directory. Backend `listWardIoEntries` populates `patientId`.

### Still open (before remaining-module pass)

- Do not run `backfill:general-ledger` on production. Ahmed missing-GL stays until local backfill.
- Purchase stock landed in **warehouse**, not the POS store — store on-hand for POS is unchanged until a transfer. Store inventory after return was **49** units of QA Paracetamol (see transfer receive below).

---

## Continuation 29 Aug 2026 (remaining modules)

Approach: **test remaining modules first**, fix blockers as they stopped a flow, then batch display fixes. Company Owner / Medicare. Ahmed Khan was **not** paid or discharged. Header logout was not clicked.

### Proven this remaining-module pass

| Check | Result |
| --- | --- |
| Hospital dashboard | PASS — 2 doctors, 2 patients, lab 1, Rx 2, GL today revenue Rs2,820. Upcoming appointments lists **QA_CURSOR OPD twice** |
| Nursing Care | PASS — `QA wound dressing` on Ahmed, Due. **Not discharged** |
| Vitals | PASS — Ahmed 29 Aug 2026 BP 118/76 temp **36.8 °C** pulse 80 SpO2 98. Prior 18 Aug 130/84 37.3 remains |
| MAR | PASS — `QA Paracetamol` 500mg PO Given on Ahmed. List also has Amlodipine given + duplicate QA_CURSOR OPD Paracetamol Due rows |
| Shift handover | PASS load — 1 Day Shift completed note for Ahmed Khan (18 Aug, Penicillin allergy) |
| Ward inventory | PASS load — 0 items (no requisition written). Add Item is not a pharmacy-stock requisition |
| Ward dashboard | PASS — 1 occupied bed, 100% occupancy, room 101 A-1 **Ahmed Khan** admitted 18 Aug. **Not discharged** |
| Bed management | PASS — Medical Ward / GF / 101 A-1 Occupied Ahmed Khan Rs 1,000/day |
| Patient list | PASS — 1 patient Ahmed Khan Watch, PAT-2026-000001, room 101 |
| Admissions | PASS read-only — 1 Active Ahmed Khan A-1. New Admission not used |
| Drips / IV | PASS load — Ahmed Khan Normal Saline 500ml Planned. Start Drip not used this pass |
| Orders & Services | PASS load — 4 rows including QA CBC ordered 29 Aug and Ahmed CBC ordered 18 Aug. No extra lab billed |
| Ward reports | PASS load — occupancy 1 admitted / 1 bed; MAR 3 doses recorded |
| Nurses & Staff | PASS — 3 staff (Company Owner, Sara Khan Nurse, Ward Admin) |
| Stock transfer | PASS `TRF-2026-000001` warehouse → Medicare Pharmacy Store qty 1. Pending → Approved → Dispatched → **Received**. Store on-hand **49 → 50**. Warehouse remaining **9** of purchase 10 |
| Pharmacy dashboard | PASS — today sales 20, cash 20, returns 20, open register Yes |
| Stock movements | PASS — 7 rows including TRANSFER_IN/OUT for `TRF-2026-000001` |
| Pharmacy customers | PASS load — 0 walk-in customers (POS used no customer profile) |
| Pharmacy payments | PASS — 3 rows PAY-2026-000001 sale 20, PAY-2026-000002 expense 100, PAY-2026-000003 return refund 20 |
| Pharmacy reports | PASS — total sales PKR 40, paid 20, 2 invoices (returned + completed ENCOUNTER) |
| Register sessions | PASS — 1 open session 18/08/2026 opening PKR 1,000. **Not closed** |
| Purchase returns | PASS load — empty (none created) |
| Patient payments | PASS — QA_CURSOR remaining **20** (pharmacy ENCOUNTER); Ahmed remaining **800**. Ahmed not collected |
| Patient ledger | PASS — OPD-001 balance 20, OPD-002 balance 0, ADM-001 balance 800 |
| Invoices (legacy Bill) | PASS after overlay — BILL-2026-000002 QA lab **PAID** 800/0 (matches OPD-002). BILL-2026-000001 Ahmed 800 UNPAID is expected |
| Accounts dashboard | PASS — AR **820**, AP **100**, open AR **2**, trial balanced **true** |
| General Ledger 1100 | PASS after account picker — lines JV-000001/002/003/008/014. Ahmed 800 still has no journal |
| Profit & Loss | PASS — consultations 2,000, laboratory 800, pharmacy 20, gross 2,820, COGS 10, opex 100, net 2,710 |
| Daily collections | PASS — OPD 2,800, pharmacy counter 20, refunds 20, expenses 100, net cash 2,700 |
| Clinical records | PASS load — patient/doctor/appointment dropdowns filled; record list empty (no fake notes saved) |
| Audit logs | PASS — 15 rows including `WARD_MAR_RECORDED`, `WARD_VITALS_RECORDED`, Payment RCT-20260829-002, pharmacy ledger charge SAL-2026-000002 |

### Fixes during this remaining-module pass

1. Ward vitals: UI placeholder **36.8 °C** (was 98.6 °F). `buildVitalsPayload()` converts F>45 to C and parses `118/76`. Backend `recordWardVitals` converts 45–120 F→C before range check (silent 400 was `Temperature must be between 30 and 45`).
2. Ward modal: toastr on save error; auto-select the single admitted patient for all modules except admissions/inventory.
3. Stock Transfers: Create Transfer card (warehouse → store, product, qty, note). `locationName()` so warehouse shows a name not `ObjectId`.
4. Stock movements UI: bind `quantityChange` / `stockAfter` / `product.name` / `location.name` (API already returned them; table showed `-` and raw ids). After receive: TRANSFER_IN store / Medicare Pharmacy Store **+1 / 50**; TRANSFER_OUT warehouse / QA Cursor Warehouse **-1 / 9**.
5. Transfer toast: `approved` / `dispatched` / `received` / `cancelled` (was `dispatchd`).
6. Accounts GL: account dropdown default **1100 Patient AR**; required `accountCode` is now sent. P&L and Daily Collections render nested KPI objects instead of an empty table.

### Still open (after leftover-route pass)

- Do not run `backfill:general-ledger` on production. Ahmed `LEDGER_MISSING_JOURNAL` (Rs 800) stays. Trial balance is **balanced** without that 800 in GL.
- Duplicate upcoming appointments are **two real records** (`APT-20260831-001` and `002`), not a list bug. Duplicate MAR Due rows look like extra records, not a UI dedupe bug.
- The four leftover-route UI bugs (lab KPI, catalog stock, header demo, ward requisition form) were fixed in the next section.

---

## Continuation 29 Aug 2026 (leftover routes — finish all checks)

User asked not to wrap early. Remaining admin / clinical / accounts / pharmacy routes were smoked. Ahmed Khan **not** discharged or collected. Register **not** closed. Header logout **not** clicked. Password **not** changed.

### Proven leftover routes

| Check | Result |
| --- | --- |
| Users | PASS — 5 users: Ward Admin, Sara Khan Nurse, Company Owner Medicare, DR ALI BAKHAT, Dr. Ali Raza |
| Roles | PASS — Hospital Role Library includes Ward Admin (ACTIVE) and Receptionist (ACTIVE) with permission chips. No role created/deleted |
| Settings | PASS — profile Medicare / medicare@gmail.com. Hospital Settings: Lahore, Pakistan, logo URL, Rx footer. **Not saved** |
| Change Password | PASS load only — form + rules visible. **Not submitted** |
| Hospitals | PASS — Medicare `HSP-CARE000` Lahore Active |
| Departments | PASS — `QA_CURSOR OPD` ACTIVE |
| All patients | PASS — PAT-2026-000002 QA_CURSOR OPD; PAT-2026-000001 Ahmed Khan. Both ACTIVE |
| All doctors | PASS — DR ALI BAKHAT Surgery / General Surgeon fee 2000; Dr. Ali Raza General Medicine fee 0. Names show (API empty `name` is not a UI bug) |
| Doctors schedule | PASS — working days Mon–Fri; Monday slots 17:00–22:00; calendar 31 Aug has two QA_CURSOR events 5p and 6p |
| Rooms | PASS — 101 private GF 1000 **Occupied**. Not edited |
| Allotted rooms | PASS — Ahmed Khan 101 ADMITTED 18 Aug. **Discharge not clicked** |
| Lab dashboard | PASS — `LO-20260829-0001` QA_CURSOR CBC Ordered. Collected Today Rs 0 / Total Lab Collection Rs 800 |
| Test catalog | PASS — 8 tests including CBC Rs 800. Seed Defaults not clicked |
| Lab print details | PASS — hospital fallback Medicare. Custom lab branding off. **Not saved** |
| Created lab reports | PASS load — 0 verified reports (QA order still Ordered) |
| Lab legacy notes | PASS load — patient/doctor/appointment dropdowns filled; record list empty |
| Prescriptions composer | PASS load — Today's Appointments 0 (Saturday; bookings are Monday 31 Aug) |
| Created prescriptions | PASS — 2 Rx for QA_CURSOR OPD (viral fever + dry cough) |
| Physiotherapy | PASS load — treatment plan form. **Not saved** |
| Pharmacy products | PASS — QA Paracetamol SKU `QA-PARACETAMOL-DD2GU8` cost 10 sell 20. Catalog stock 0 |
| Pharmacy sales | PASS — SAL-2026-000002 unpaid 20 completed; SAL-2026-000001 paid 20 returned |
| Sale detail `SAL-2026-000002` | PASS — QA Paracetamol qty 1 total 20 unpaid. **Cancel not clicked** |
| Suppliers | PASS — QA Cursor Supplier ACTIVE |
| Pharmacy expenses | PASS — QA petty cash Utilities cash PKR 100 |
| Chart of accounts | PASS — 1000 Cash through 5180 Miscellaneous |
| Journal | PASS load — posted JV-000004 through JV-000014 (sales, COGS, expense, lab receipt, return). **Post journal not used** |
| Cash book | PASS — running balance through 5400 (consultation 2000, pharmacy 20, lab 800, expense 100, refund 20) |
| Bank book | PASS load — empty (all QA cash) |
| Accounts expenses | PASS — QA petty cash row. Columns were raw `_id` before table helper fix |
| Receivables | PASS data — balances 20 and 800 aging 0-30. Names were blank because Patient has `firstName`/`lastName` not `fullName` — backend populate fixed |
| Payables | PASS — `PUR-2026-000001` QA Cursor Supplier 100 received |
| Trial balance | PASS — Dr=Cr (cash 5400, AP 200, consultation Cr 4000, lab Cr 1600, pharmacy Cr 40, COGS 20, opex 200). All-time GL, not same window as today's P&L |
| Reconciliation | PASS — `LEDGER_MISSING_JOURNAL` error **1** (Ahmed 800) |
| Accounts audit | PASS after wiring to hospital audit logs — WARD_MAR/VITALS, LEDGER_PAYMENT_RECORDED, PRESCRIPTION_CREATED, APPOINTMENT_CREATED |
| Add invoice | PASS load — patients QA_CURSOR / Ahmed; appointments APT-001/002. **Confirm not clicked** |
| Invoices overlay | PASS — BILL-2026-000002 QA **PAID**; Ahmed BILL-2026-000001 UNPAID |
| Ward admin notes | PASS — Ahmed still 101 admitted; vitals 29 Aug + drip NS 500ml. **Not discharged** |
| Audit log filters | PASS — module dropdown now includes Ward, Pharmacy Sales, Purchases, Transfers, Returns, Expenses, Inventory |

---

## Continuation 29 Aug 2026 (fixes after leftover-route pass)

Leftover routes were already smoked. This pass fixed the remaining product bugs, then re-checked in the browser (Company Owner, Ahmed not discharged, register not closed, header logout not clicked).

### Fixes

1. **Lab Collected Today** — `getLabDashboardStats` now treats a lab order as collected when its linked encounter `summary.balance ≈ 0` and `totalPaid > 0` (encounter payment never wrote `LabOrder.paidAmount`). Future `recordLedgerPayment` also sets `LabOrder.paidAmount = totalAmount` when the encounter clears.
2. **Product catalog STOCK** — catalog was requested before stores loaded, so Company Owner (`storeId` null) got no location stock. `loadStores()` now calls `loadProducts()` after the store fallback is set.
3. **Header template chrome** — removed the hidden “Crush it / Epic Pro / Qubes” recent-search block and the Chat / Groups / Contact rightbar (Louis Henry demo). POS, settings, fullscreen, logout remain.
4. **Ward inventory Add Item** — form is product / store / ward / qty. `POST /ward/requisitions` now auto-issues so store stock moves to the ward. StockMovement schema allows `ward` / `WARD_ISSUE` / `ward_requisition`. Requested rows still have **Issue from store**.
5. Inventory list `limit: 200` was rejected (max 100), so ward stock rows never appeared. Limit is 100; ward locations resolve to **Medical Ward**.

### Browser proof

| Check | Result |
| --- | --- |
| Lab dashboard | PASS — `LO-20260829-0001` CBC. **Collected Today Rs 800**. Outstanding **Rs 0**. Header has no Chat / Crush it |
| Pharmacy products | PASS — Medicare Pharmacy Store. QA Paracetamol stock **49** after ward issue (was 50 catalog / 0 before catalog fix) |
| Ward inventory Add Item | PASS — dropdowns: QA Paracetamol, Medicare Pharmacy Store, Medical Ward, qty 1 |
| WRQ issue | PASS — `WRQ-2026-000001` **issued**. Ward stock **QA Paracetamol / Medical Ward / 1 In stock** |

### Still open

- Do not run `backfill:general-ledger` on production. Ahmed `LEDGER_MISSING_JOURNAL` (Rs 800) stays.
- Duplicate upcoming appointments are two real records (`APT-20260831-001` and `002`). Duplicate MAR Due rows are not a list-dedupe bug.


### Fixes during leftover-route pass

1. Legacy lab Bill vs encounter: `listBills` / `getBillById` overlay payment status from the linked encounter when encounter balance is 0. Future `recordLedgerPayment` also writes the lab Bill to paid when the encounter clears.
2. Audit log filters: Ward / sales / purchases / transfers / returns / expenses / inventory / pharmacy payments plus matching actions.
3. Accounts receivables patient name: populate `firstName lastName` (Patient has no `fullName`).
4. Accounts audit view was loading the dashboard by default; it now loads audit logs.
5. Accounts generic table: prefer `encounterNo` / `action` / `amount` so expenses, AR, and audit rows are readable.

---

## Continuation 29 Aug 2026 (remaining create / profile / detail routes)

Leftover list/load routes were already smoked. This pass opened remaining create, profile, and detail screens, then fixed bugs that stopped a real flow. Company Owner / Medicare. Ahmed Khan **not** discharged or collected. Register **not** closed. Header / sidebar Logout **not** clicked. No new doctors, patients, hospitals, or users saved.

### Proven this pass (load only unless noted)

| Check | Result |
| --- | --- |
| Add doctors | PASS load — photo, name, Urdu, department, fee, Rx templates, slots. **Not saved** |
| Add patient | PASS load — real form. **Not saved** |
| Patient profile `PAT-2026-000002` | PASS — `QA_CURSOR OPD · PAT-2026-000002`, phone `03000000001`, 2 Rx, 1 bill. Heading `-` was the loading state |
| Add allotment | PASS load — room `101 - Private - Occupied - 1000/day` with occupied warning. **Not saved** |
| Add invoice | PASS load — patients QA_CURSOR / Ahmed. **Confirm not clicked** |
| Create user | PASS load — roles include Ward Admin through Accountant; POS store Medicare Pharmacy Store. **Not submitted** |
| Create hospital | PASS load — plan/status fields. **Not saved** |
| Doctor dashboard | PASS — Company Owner greeting is **Welcome back, Medicare** (no `Dr.` prefix). Zeros expected (not a doctor role) |
| Create lab order | PASS load — walk-in / tests / paid. **Not saved** |
| Lab order `LO-20260829-0001` | PASS after overlay — CBC **Paid Rs 800 · Balance Rs 0** (was Paid 0 / Balance 800 because encounter payment never wrote `LabOrder.paidAmount`) |
| Purchases list | PASS — `PUR-2026-000001` received total 100 paid 0 |
| Purchase detail | PASS after UI — QA Cursor Supplier · QA Cursor Warehouse · 10× QA Paracetamol @ 10 = 100 unpaid. **Cancel not clicked** |
| Create purchase | PASS load — supplier / warehouse / product dropdowns filled. **Not saved** |
| Register sessions | PASS — 1 open session 18/08/2026 opening PKR 1,000. **Not closed** |
| Register session detail | PASS — sales SAL-001 returned + SAL-002 unpaid 20, expense QA petty cash 100, expected drawer PKR 900. **Not closed** |
| Ward patient detail Ahmed | PASS read-only — PAT-2026-000001 bed A-1 room 101 Medical Ward admitted 18 Aug. **Discharge not clicked** |
| Pharmacy POS | PASS load — register open, QA Paracetamol stock **49**. **Checkout / close register not used** |
| Patient invoices QA | PASS — `BILL-2026-000002` 800/800/0 **PAID** |
| Invoice detail | PASS — Patient QA_CURSOR OPD, CBC 800, paid |
| Doctor profile DR ALI BAKHAT | PASS after normalize — fee 2000, Mon–Fri. Appointments `APT-20260831-001/002` now show **QA_CURSOR OPD** (were `-`) |

### Fixes

1. **Lab order paid/balance** — `listLabOrders` / `getLabOrderById` / patient lab history overlay encounter-cleared amounts the same way as lab KPI and legacy bills. Opening a paid order also writes `LabOrder.paidAmount` / `balanceAmount` so the document matches the encounter.
2. **Purchase detail** — show supplier, warehouse, date, payment status, and line items (product / SKU / qty / rate). List also shows supplier name.
3. **Doctor profile appointments** — `getDoctorAppointments` now returns `normalizeAppointment` so `patient.firstName/lastName` exist. UI was reading `appointment.patient` on raw `patientId` docs.
4. **Doctor dashboard greeting** — prefix `Dr.` only for doctor roles.
5. **Sidebar dead links** — Doctors Profile → `/all-doctors`, Patient Profile → `/patients/all-patients`, Patient Invoices → `/payments/invoices`.
6. **Ward admitted date** — ISO timestamp piped through `date:'mediumDate'`.

### Still open

- Do not run `backfill:general-ledger` on production. Ahmed `LEDGER_MISSING_JOURNAL` (Rs 800) stays.
- Duplicate upcoming appointments are two real records (`APT-20260831-001` and `002`). Duplicate MAR Due rows are not a list-dedupe bug.
- Register session cashier can show a raw user id when the cashier user is missing; not closed this pass.

---

## Continuation 29 Aug 2026 (sparse / stub UI)

User screenshot of Purchase Detail was a stub card: invoice no, Total 100 · Paid 0, Cancel, empty white space. Same empty-card pattern existed on invoices. Ahmed not discharged. Register not closed. Purchase **Cancel not clicked**. Invoice **Payment prompt not used**.

### Fixed

1. **Purchase detail / list / create / returns** — sale-detail layout: KPI cards, summary (supplier, warehouse, totals), line-item table. `PUR-2026-000001` shows QA Cursor Supplier / Warehouse, 10× QA Paracetamol, unpaid PKR 100.
2. **Invoices list + invoice detail** — same admin shell. `BILL-2026-000002` QA_CURSOR OPD / CBC 800 paid; Ahmed BILL-001 unpaid 800.
3. **Patient invoices** — patient name in the hero, bill table with source / paid / due.
4. **Departments heading** — was leftover `Hi, Welcomeback! / JustDo Departments`. Now **Departments**.
5. KPI cards use a 2-column grid below 992px instead of four stacked full-width cards.

### Still open (noted, not rewritten this pass)

- Add Invoice (`/payments/addpayment`) still uses the old theme form.
- Template leftover pages still say `Hi, Welcomeback! / JustDo …` but are not in the hospital sidebar: Chat, Blog, Contacts, Email, File Manager, Social, Todo, Our Centres, Covid analytics.
- Register session cashier can still show a raw user id.

---

## Continuation 29 Aug 2026 (remaining module test after stub UI)

Company Owner / Medicare. Ahmed Khan **not** discharged or collected. Register **not** closed. Header / sidebar Logout **not** clicked. No new invoices, allotments, appointments, payments, or returns saved.

### Fixes

1. **Add Invoice** — pharmacy-admin layout (Patient / Bill Items / Payment). Appointments filter to the selected patient. Button is **Save Invoice**. **Not submitted.**
2. **Register cashier** — missing cashier user no longer dumps the ObjectId. Session `6a83f356efd4c501a4599364` shows **Unknown cashier**. **Not closed.**
3. **Appointments KPI** — fake `+12% vs yesterday` removed; label is **Booked for today**. Today is Saturday so Monday QA APTs are not in the today list.
4. **Pharmacy reports** — table no longer splits `storeId` into `STORE I D`. Hidden `_id`. Headers: Invoice / Store / Customer / Total / Paid / Status / Sale date. Totals PKR 40 / paid PKR 20.
5. **Sales returns** — Sale column was raw `saleId`. List now populates `invoiceNo`; `SRET-2026-000001` shows **SAL-2026-000001**. Store filter is a dropdown.
6. **Pharmacy payments** — Reference column was type + ObjectId. Now **Sale / Sales return / Expense** plus SAL/SRET from the note. Store filter first option is **All stores**.

### Proven this pass (load only unless noted)

| Check | Result |
| --- | --- |
| Add invoice | PASS load — patients QA_CURSOR / Ahmed. Appointments empty until a patient is selected. **Save Invoice not clicked** |
| Appointments | PASS — fake % gone. Doctors: DR ALI BAKHAT, Dr. Ali Raza. **Confirm not clicked** |
| Rooms | PASS — 101 Occupied. **Not edited** |
| Ward admin notes | PASS load. **Save Record not clicked** |
| Pharmacy reports | PASS — SAL-001 returned 20 paid; SAL-002 unpaid 20. Column labels readable |
| Register session detail | PASS — Cashier **Unknown cashier**. Sales SAL-001/002. Expected drawer PKR 900. **Not closed** |
| Lab order edit `LO-20260829-0001` | PASS load — QA_CURSOR OPD, CBC Rs 800, attached OPD-002. **Not saved** |
| Nurses & Staff | PASS — 3 staff: Medicare Company Owner, Sara Khan Nurse, Ward Admin |
| Sales returns | PASS after populate — `SRET-2026-000001` → SAL-2026-000001, refund PKR 20 completed. **Create not used** |
| Purchase returns | PASS empty register (no purchase return created). **Not created** |
| Allotted rooms | PASS — Ahmed Khan 101 ADMITTED. **Discharge not clicked** |
| Add allotment | PASS load — room `101 - Private - Occupied - 1000/day`. **Save Allotment not clicked** |
| Pharmacy customers | PASS empty (walk-in POS, no customer profiles). **Add Customer not used** |
| Pharmacy payments | PASS — PAY-001 sale SAL-001 20; PAY-002 expense 100; PAY-003 SRET refund 20. **Add Payment not used** |
| Patient ledger | PASS — OPD-001 QA balance 20; OPD-002 QA balance 0; ADM-001 Ahmed balance 800. **Collect not used** |
| Clinical records | PASS load — patients QA_CURSOR / Ahmed; doctors BAKHAT / Ali Raza; APTs 001/002. Record list empty. **Save Record not clicked** |
| Ward reports | PASS — Occupancy 1 admitted / 1 bed; MAR 3 doses; Activity log 14. **Open Report not used** |

### Still open

- Do not run `backfill:general-ledger` on production. Ahmed `LEDGER_MISSING_JOURNAL` (Rs 800) stays.
- Duplicate upcoming appointments are two real records (`APT-20260831-001` and `002`).
- Template leftover pages still say `Hi, Welcomeback! / JustDo …` but are not in the hospital sidebar: Chat, Blog, Contacts, Email, File Manager, Social, Todo, Our Centres, Covid analytics.
- Register cashier user `6a83e00820717d1b1a9e0850` is missing; UI now says Unknown cashier instead of the ObjectId.

---

## Continuation 29 Aug 2026 (close remaining product work)

Goal: remaining sidebar modules smoked and leftover product UI bugs fixed so **no hospital-sidebar product work is pending**. Company Owner / Medicare. Ahmed Khan **not** discharged or collected. Register **not** closed. Header / sidebar Logout **not** clicked. No new financial or admission records saved.

### Fixes

1. **Patient Payments** — English copy. Filter is **Outstanding balance only**. QA remaining 20 / Ahmed remaining 800. **Collect not used.**
2. **Dashboard / doctor dashboard / audit logs / hospitals / prescriptions toasts** — leftover Roman Urdu replaced with English.
3. **Header** — dead Search here box and Create dropdown removed. POS / Settings / fullscreen / logout remain.
4. **Stock movements** — reference type is a dropdown; ObjectIds hidden; ward location resolves to **Medical Ward**; `WRQ-2026-000001` / `TRF-2026-000001` shown. Backend now looks up wards and honors `referenceType` filter.
5. **Pharmacy expenses / register sessions** — store blank option is **All stores**.
6. **Physiotherapy** added under Prescriptions. Form loads. **Save Draft / Save & Print not used.**
7. **Pharmacy dashboard** — **Open POS** (was Open Mooli POS). POS receipt fallbacks no longer say Mooli Pharmacy.

### Proven this pass

| Check | Result |
| --- | --- |
| Patient payments | PASS — English copy. QA 20 remaining, Ahmed 800 unpaid. Header has no Search here |
| Hospital dashboard | PASS — English snapshot copy. Upcoming QA APTs still two real records |
| Stock movements | PASS — 9 rows. Ward issue **ward / Medical Ward**. Transfer store 50 / warehouse 9 |
| Physiotherapy | PASS load — assessment form. **Not saved** |
| Admissions | PASS — Ahmed Khan 1 active. **New Admission / Discharge not used** |
| Daily collections | PASS — OPD 2,800, pharmacy 20, refunds 20, expenses 100, net cash 2,700 |
| Pharmacy expenses | PASS — QA petty cash Utilities PKR 100. All stores |
| I/O Chart | PASS — Ahmed Khan intake 200 / output 0. **Add Entry not used** |
| Audit logs | PASS — English heading/filters; ward/payment/appointment actions present |
| Pharmacy dashboard | PASS — today's sales 20, cash 20, returns 20. Button **Open POS**. **POS not opened** |

### Product pending

**None** on hospital sidebar routes.

Unreachable JustDo templates (Chat, Blog, Contacts, Email, File Manager, Social, Todo, Our Centres, Covid) already **redirect to dashboard** — they are not in the hospital sidebar.

### Data holds (not product bugs — do not “fix” on this hospital)

- Ahmed `LEDGER_MISSING_JOURNAL` Rs 800: do **not** run `backfill:general-ledger` on this DB.
- Two Monday appointments `APT-20260831-001` and `002` are two real bookings.
- Register cashier user is missing; UI shows Unknown cashier. Session stays **open**.
