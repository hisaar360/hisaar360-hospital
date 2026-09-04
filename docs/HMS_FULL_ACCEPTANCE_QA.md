# Hisaar360 HMS — Full Acceptance QA Report

**Date:** 2026-09-01 (updated)  
**Status:** **PARTIAL**

---

## FINAL_ACCEPTANCE_BASELINE (re-fetched 2026-09-01)

| Metric | Value |
|--------|--------|
| Trial Balance Debit | **64,420** |
| Trial Balance Credit | **64,420** |
| TB Balanced | **YES** |
| Cash Book closing | **62,040** |
| Stock (QA product) before | **326** |

**PRE-EXISTING reconciliation:** ENCOUNTER_SUMMARY_MISMATCH (2), LEDGER_MISSING_JOURNAL (6), PAYMENT_MISSING_JOURNAL (3+)

---

## Playwright Scenario A (latest)

| Step | Result |
|------|--------|
| A1 Patient UI | PASS — PAT-2026-000025 |
| A1 Appointment UI | PASS — APT-20260901-008 |
| A2 Recommend Admission UI | **FAIL** (doctor select / POST timeout) |
| A2 API fallback | USED — AOR-20260901-001 |
| A3 Admit UI | PASS (Save Allotment) |
| A3 encounter link | **FAIL** |
| A4–A15 | NOT RUN |
| **A RESULT** | **FAIL** |

---

## Scenario B

**SKIP** (Scenario A did not pass)

---

## RBAC API probes

**PASS** (Doctor, Ward, Nurse, Pharmacy, Accountant)

---

## Reference: API ward acceptance (`final-ward-acceptance-qa.js`)

Exit 0, blockers []. Validates backend chain (PAT-2026-000026, ADM-20260901-001, lab/pharmacy/procedure/discharge). Not a substitute for Playwright UI acceptance.

---

## Prior session (verified, not re-tested)

Department Performance, Help Center, smoke 13/13, backend 65/65, Angular build PASS.

---

## Blockers

1. `hms-doctor-select` not reliable in headless Playwright for Recommend Admission
2. UI admit does not immediately surface encounter via API
3. Scenarios A4–A15 and entire Scenario B not executed in Playwright

---

## Document / Export System (2026-09-02) — CODE COMPLETE

| Area | Preview | PDF | Print | Same Template |
|------|---------|-----|-------|---------------|
| Shared toolbar | PASS | PASS | PASS | PASS |
| Accounts reports | PASS | PASS | PASS | PASS |
| Patient Ledger | PASS | PASS | PASS | PASS |
| Invoice | PASS | PASS | PASS | PASS |
| Payment Receipt | PASS | PASS | PASS | PASS |
| Lab report | PASS | PASS | PASS | PASS |
| Birth certificate | PASS | PASS | PASS | PASS |
| Admission recommendation | PASS | PASS | PASS | PASS |
| MAR / Ward summary / Vitals / Imaging / Discharge | PASS | PASS | PASS | PASS |

- Reprint existing certificate: version unchanged (no new ACTIVE certificate)
- Public verification demo cert: **VALID** (no CNIC/billing/Mongo IDs in response)
- Document exports: **0** ledger/journal/stock side effects (read-only contract)

## Nursery Demo Seed (2026-09-02)

```bash
cd hisaar360-hospital-backend
npm run seed:nursery-demo
```

| Item | Value |
|------|--------|
| Mother | CURSOR_QA_NURSERY_MOTHER DEMO |
| Baby | CURSOR_QA_BABY_DEMO DEMO |
| Second run | Idempotent (1 mother, 1 baby, 1 cert v1) |
| Verify | VALID |

## Tests (2026-09-02)

| Suite | Result |
|-------|--------|
| Backend | **80/80 PASS** (`npm test`) |
| Frontend focused | **32/32 PASS** (help-search, duty-roster util, role workflows) |
| Angular build | **PASS** |
| Help Center | included in 32/32 |

## Duty Roster / Ward UI (2026-09-03)

| Item | Note |
|------|------|
| Birth/Nursery Doctor populate | `ref: 'DoctorProfile'` (canonical model). Do not register a second Doctor collection. |
| Session expiry | Local → `{origin}/login`. Production → `https://hisaar360.com/login`. |
| Duty Roster mental model | Date → Area → Shift → Coverage → Staff |
| Tree drilldown | Ward → Ward Level / Room → Staff. Lab/Pharmacy nodes only if modules enabled. |
| Open Shift | + Fill Open Position prefills date, area, shift, role. |
| Bulk Assign | 5-step modal. Preview then `POST /ward-billing/roster/bulk`. Conflicts reported; no silent partial commit when atomic. |
| Conflict | 409 `ROSTER_CONFLICT` remains authoritative. |
| Draft / Publish | Save Draft uses create; Publish uses update. |
| Copy Previous Week | Existing preview + copy-week. |
| PDF / Print | Shared `HmsDocumentService` weekly landscape / day portrait. |
| Tutorial | Page-scoped Start Tutorial / ? Help. No TutorialV2. |
| Ward Dashboard | `/ward/dashboard` Ward Control Center. Real control-center data. |
| Orders / Inventory | Same module pages + shared overlay menu. |

## FULL CLINICAL BROWSER FLOWS 1–6

**PENDING SEPARATE ACCEPTANCE** (not run in this pass)

## FINAL

**PRODUCT IMPLEMENTATION COMPLETE — BROWSER ACCEPTANCE PENDING**
