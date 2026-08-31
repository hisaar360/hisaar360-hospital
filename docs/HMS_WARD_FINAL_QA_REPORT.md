# HMS Ward / IPD — Final QA Report

**Status: IPD/Ward Flow — IMPLEMENTATION COMPLETE** (2026-08-31)

## Final acceptance evidence

| Check | Result | Evidence |
|-------|--------|----------|
| API Acceptance A–I | **9/9 PASS** | `node src/scripts/final-ward-acceptance-qa.js` |
| RBAC API | **7/7 PASS** | Same script |
| RBAC Browser | **PASS** | Playwright `browser-ui-acceptance-qa.js` — one role/session at a time |
| Browser Acceptance | **28/28 PASS** | Same script |
| Backend tests | **55/55 PASS** | `npm test` |
| Angular production build | **PASS** | `npm run build` |
| Trial Balance | **64,420 / 64,420** | Before workflow 50,300 / 50,300 |
| Pharmacy stock | **330 → 326** | WMR-20260831-001 issue |
| Settlement duplicate payment/journal | **0** | Pharmacy settlement verification |

## QA patient (final financial acceptance — read-only for UI pass)

| Field | Value |
|-------|-------|
| Patient | CURSOR_QA_FINAL IPD_1788179815727 |
| MR No | PAT-2026-000020 |
| Admission | ADM-20260831-002 (`6a957581378b83ffcbd47ac0`) |
| Lab | LO-20260831-0002 |
| Medicine Request | WMR-20260831-001 |
| Pharmacy Sale | SAL-2026-000016 |
| Procedure | WPR-20260831-001 |
| Operation | WOT-20260831-001 (cancelled — must not show as paid charge) |

## Browser verification matrix

| Area | Result | Notes |
|------|--------|-------|
| Business Owner — ward patient list/detail | **PASS** | All tabs render human-readable IDs |
| Procedures / Operations tabs | **PASS** | WPR/WOT numbers, doctor names, status badges |
| Discharge statement | **PASS** | Sections separated; security not shown as revenue; internal pharmacy settlement excluded from patient total |
| Duty roster (FullCalendar) | **PASS** | Month/week/day views; filters; event persistence |
| Ward Receptionist RBAC | **PASS** | Allowed ward routes; accounts/pharmacy admin blocked (403) |
| Nurse — medicines tab | **PASS** | WMR visible; payment/settlement/accounts blocked |
| Pharmacy — ward requests/settlements | **PASS** | WMR + SAL settlement readable |
| Accountant — all accounts pages | **PASS** | Patient profitability + doctor performance (names not Mongo IDs) |
| Appointment Receptionist / Laboratory RBAC | **PASS** | Menu + direct URL checks |

## Implementation delivered

1. Role permission sync — idempotent `syncSystemRolePermissions` + QA users script
2. Medicine request → pharmacy issue → ward billing
3. Procedures / operations — structured models + UI tabs
4. Duty roster — FullCalendar + overlap validation
5. Discharge statement — enriched API + print panel
6. Pharmacy ward settlement — internal settlement without duplicate patient GL
7. Doctor performance report — dedicated page component (`DoctorPerformancePageComponent`)
8. Automated tests — ward-billing + financial invariants + browser acceptance script

## Historical session notes (2026-08-31 earlier pass)

Earlier partial browser runs were blocked by stale JWT after permission sync and by a doctor-performance UI hang in the shared accounts page. Both resolved before final sign-off.

## Pre-existing reconciliation (historical)

Hospital-scoped reconciliation may still report historical ledger gaps from rows created before GL posting — **not caused by PAT-2026-000020**. Do not run `npm run backfill:general-ledger` without operator approval.
