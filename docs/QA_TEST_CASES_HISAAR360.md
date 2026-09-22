# Hisaar360 Hospital — QA Test Cases (Manual)

| Field | Value |
|---|---|
| Product | Hisaar360 Hospital Management System |
| Document | Manual QA Workbook |
| Edition | Hospital (full modules ON) |
| Version | 1.0 |
| Last updated | 2026-09-22 |
| How to use | Har case me **Pass / Fail / Notes** fill karo. Role change ke baad **re-login** lazmi. |

**TC columns:** `TC-ID` · Preconditions · Steps · Expected · Result (Pass/Fail) · Notes

---

## Ch 0 — Test preparation

### 0.1 Environment

| Item | Local default |
|---|---|
| Frontend | `http://localhost:4200` |
| API | `http://localhost:3001/api/v1` |
| Auth | Hisaar360 Central Auth / local login |
| Modules | pharmacy + laboratory + ward + clinical = **ON** |

### 0.2 Fixtures (create once)

- [ ] 1 hospital with all modules enabled
- [ ] 1 adult patient (mobile number known)
- [ ] 1 pediatric patient (for Peds specialty)
- [ ] 1 ward + at least 1 free bed
- [ ] Pharmacy store + **open register**
- [ ] Lab catalog: at least 2 tests with prices
- [ ] Medicines in stock for Rx issue

### 0.3 QA users (system roles)

| Role | Purpose |
|---|---|
| Hospital Admin | Setup, users, roles, modules |
| Receptionist | OPD patients + appointments |
| Doctor (General Medicine) | OPD Rx + admit recommend |
| Doctor (OBGYN) | Specialty smoke |
| Doctor (Pediatrics) | Specialty smoke |
| Doctor (Cardiology) | Specialty smoke |
| Pharmacy | Rx issue + ward medicine issue |
| Lab Receptionist | Create lab order |
| Lab Technician | Sample + results |
| Pathologist | Verify results |
| Ward Receptionist | Admit / bed / discharge desk |
| Ward Admin | Roster, beds, assignments |
| Nurse | Vitals, MAR, care |
| Ward Attendant | Tasks only |

**Rule:** Roles/permissions edit ke baad user **logout → login**.

---

## Ch 1 — Role action matrix

Har role ke liye: pehle **positive**, phir **negative** (URL steal / wrong menu).

### TC-RBAC-001 — Receptionist allowed actions

| | |
|---|---|
| **Preconditions** | Login as **Receptionist** |
| **Steps** | 1. Open left menu. 2. Go Patients → All Patients. 3. Open Appointments. |
| **Expected** | Patients + Appointments visible and usable. No Ward & Nursing full ops, no Laboratory menu, no Consultation write. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-002 — Receptionist blocked from Ward / Lab / Rx write

| | |
|---|---|
| **Preconditions** | Login as **Receptionist** |
| **Steps** | 1. Manually open `/ward/admissions`. 2. Open `/laboratory/create-order`. 3. Open `/prescriptions`. |
| **Expected** | Redirect or access denied for ward/lab/Rx write shells (per permissions). Cannot create lab order or write prescription. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-003 — Doctor allowed actions

| | |
|---|---|
| **Preconditions** | Login as **Doctor** |
| **Steps** | 1. Open `/prescriptions`. 2. Open appointments (own). 3. Open patient and start consultation. |
| **Expected** | Consultation UI loads; can save prescription. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-004 — Doctor cannot use Pharmacy POS sell as primary role

| | |
|---|---|
| **Preconditions** | Login as **Doctor** (no pharmacy sell perms) |
| **Steps** | Open `/pharmacy/pos`. |
| **Expected** | Blocked or no sell capability without pharmacy perms/register. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-005 — Pharmacy allowed actions

| | |
|---|---|
| **Preconditions** | Login as **Pharmacy**; register open |
| **Steps** | 1. Open `/pharmacy`. 2. Open POS. |
| **Expected** | Pending prescriptions list + POS usable. No Appointments write. No Rx create. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-006 — Ward Admin menu (no Lab / OPD shells)

| | |
|---|---|
| **Preconditions** | Login as **Ward Admin** (or Ward Supervisor alias) |
| **Steps** | 1. Check left menu. 2. Confirm Ward & Nursing present. 3. Confirm Laboratory / Consultation menus hidden. |
| **Expected** | Ward menus only for ops; Laboratory and OPD Consultation not in sidebar. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-007 — Ward Admin URL cannot steal Lab page

| | |
|---|---|
| **Preconditions** | Login as **Ward Admin** |
| **Steps** | Manually change URL to `/laboratory/create-order`. Try patient search if page loads. |
| **Expected** | Redirect away from lab shell. Lab create API must be **403** if called. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-008 — Nurse allowed care actions

| | |
|---|---|
| **Preconditions** | Login as **Nurse**; at least one assigned/admitted patient |
| **Steps** | Open `/ward/my-work` → patient detail → vitals / MAR. |
| **Expected** | Can record vitals and MAR dose. No Lab dashboard menu. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-009 — Ward Attendant tasks only

| | |
|---|---|
| **Preconditions** | Login as **Ward Attendant** |
| **Steps** | 1. Land on `/ward/tasks`. 2. Try `/ward/patient-list` or clinical chart URL. |
| **Expected** | Tasks visible. Clinical chart / billing not available. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-RBAC-010 — Lab roles stay in Laboratory

| | |
|---|---|
| **Preconditions** | Login as **Lab Receptionist** |
| **Steps** | Open Laboratory menu → Create Order / Dashboard. |
| **Expected** | Lab screens work. Ward care and Pharmacy POS not primary menus. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Ch 2 — OPD → Prescription → Pharmacy issue

**Flow:** Receptionist → Doctor → Pharmacy

### TC-OPD-001 — Register / find patient (Receptionist)

| | |
|---|---|
| **Login as** | Receptionist |
| **Steps** | 1. Patients → Add or search by mobile. 2. Save/open patient. |
| **Expected** | Patient profile with PAT-ID and mobile. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-OPD-002 — Book appointment (Receptionist)

| | |
|---|---|
| **Login as** | Receptionist |
| **Steps** | Appointments → create for patient + doctor + today. |
| **Expected** | Appointment listed for doctor. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-OPD-003 — Write prescription (Doctor)

| | |
|---|---|
| **Login as** | Doctor (General Medicine) |
| **Steps** | 1. Open `/prescriptions`. 2. Select patient. 3. Add diagnosis + at least 1 medicine (dose/freq). 4. Save. |
| **Expected** | Prescription saved; appears under Created Prescriptions. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-PHARM-001 — Issue medicine from prescription (Pharmacy)

| | |
|---|---|
| **Login as** | Pharmacy |
| **Preconditions** | TC-OPD-003 done; register open; stock available |
| **Steps** | 1. Open `/pharmacy`. 2. Find pending Rx. 3. Click Issue → POS opens with `prescriptionId`. 4. Complete sale / payment. |
| **Expected** | Sale created linked to prescription; stock reduced; Rx no longer pending (or marked issued). |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-PHARM-002 — Cannot issue without stock / closed register

| | |
|---|---|
| **Login as** | Pharmacy |
| **Steps** | Try POS sale with closed register OR zero stock medicine. |
| **Expected** | Clear error; sale not completed. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-OPD-004 — End-to-end OPD smoke (all three logins)

| | |
|---|---|
| **Steps** | Run TC-OPD-001 → 002 → 003 → TC-PHARM-001 in order with re-login each role. |
| **Expected** | Full chain works without data loss. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Ch 3 — Laboratory lifecycle

**Flow:** Lab Receptionist → Lab Technician → Pathologist

### TC-LAB-001 — Create lab order

| | |
|---|---|
| **Login as** | Lab Receptionist (or user with `lab_orders.create`) |
| **Steps** | 1. `/laboratory/create-order`. 2. Search patient mobile. 3. Select patient. 4. Add ≥1 test. 5. Priority Normal. 6. Create (pay now optional). |
| **Expected** | Order created with order ID; appears on Lab Dashboard. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-LAB-002 — Collect sample

| | |
|---|---|
| **Login as** | Lab Technician |
| **Steps** | Open order detail → Collect sample. |
| **Expected** | Sample status updated; ready for results. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-LAB-003 — Enter results

| | |
|---|---|
| **Login as** | Lab Technician |
| **Steps** | Enter result values for each item → save. |
| **Expected** | Results saved; awaiting verification if required. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-LAB-004 — Verify results (Pathologist)

| | |
|---|---|
| **Login as** | Pathologist |
| **Steps** | Open order → Verify item(s). |
| **Expected** | Status verified; report ready. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-LAB-005 — Created reports / print

| | |
|---|---|
| **Login as** | Lab Receptionist or Technician |
| **Steps** | Open `/laboratory/created-reports` → open/print report. Print invoice if payment collected. |
| **Expected** | Report printable; patient/tests/results correct. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-LAB-006 — Lab E2E chain

| | |
|---|---|
| **Steps** | TC-LAB-001 → 002 → 003 → 004 → 005 |
| **Expected** | Complete lifecycle without stuck status. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-LAB-007 — Ward role cannot create via Lab UI

| | |
|---|---|
| **Login as** | Ward Admin |
| **Steps** | URL `/laboratory/create-order`. |
| **Expected** | Blocked (same as TC-RBAC-007). Ward lab orders (if any) go via Ward chart / ward orders, not Lab Dashboard. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Ch 4 — Ward: admission → nurse care → discharge

**Flow:** Doctor → Ward Receptionist → Ward Admin → Nurse → (Pharmacy optional) → Discharge desk → Attendant check

### TC-WARD-001 — Doctor recommends admission

| | |
|---|---|
| **Login as** | Doctor |
| **Steps** | From clinical/ward recommend admission for patient (reason + preferred ward if asked). |
| **Expected** | Recommendation created / visible to ward desk. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-002 — Ward Receptionist admits + bed

| | |
|---|---|
| **Login as** | Ward Receptionist |
| **Steps** | 1. `/ward/admissions`. 2. Admit patient. 3. Allot bed. |
| **Expected** | Active admission; bed occupied; patient on ward list. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-003 — Ward Admin assignment / home

| | |
|---|---|
| **Login as** | Ward Admin |
| **Steps** | Open Ward Home / assignments → assign nurse to patient or confirm bed board. |
| **Expected** | Assignment saved; nurse can see patient in My Work (if assignment model used). |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-004 — Nurse records vitals

| | |
|---|---|
| **Login as** | Nurse |
| **Steps** | `/ward/my-work` → patient → Vitals → enter BP/HR/Temp → save. |
| **Expected** | Vitals appear on chart timeline. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-005 — Nurse MAR dose

| | |
|---|---|
| **Login as** | Nurse |
| **Preconditions** | Medicine order / MAR entry exists |
| **Steps** | Open MAR → record dose given. |
| **Expected** | Dose logged with time/user. (This is NOT pharmacy POS dispense.) |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-006 — Nurse drip / I-O smoke

| | |
|---|---|
| **Login as** | Nurse |
| **Steps** | Add one drip action OR one I/O entry. |
| **Expected** | Entry saved on chart. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-007 — Shift handover note

| | |
|---|---|
| **Login as** | Nurse |
| **Steps** | Shift handover → add note for next shift. |
| **Expected** | Handover visible to next nurse/admin. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-008 — Ward medicine request → Pharmacy issue (optional)

| | |
|---|---|
| **Login as** | Nurse then Pharmacy |
| **Steps** | 1. Nurse creates medicine request. 2. Re-login Pharmacy → issue request. |
| **Expected** | Request issued; ward billing/settlement updated if applicable. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-009 — Discharge readiness + discharge

| | |
|---|---|
| **Login as** | Ward Receptionist (or Admin with discharge rights) |
| **Steps** | 1. Open patient discharge tab. 2. Complete bill/payment if required. 3. Discharge. |
| **Expected** | Admission closed; bed free; discharge statement printable. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-010 — Full IPD E2E

| | |
|---|---|
| **Steps** | TC-WARD-001 → 002 → 003 → 004 → 005 → 009 (006–008 optional) |
| **Expected** | Admit to discharge completes; bed freed. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-WARD-011 — Attendant cannot open clinical chart

| | |
|---|---|
| **Login as** | Ward Attendant |
| **Steps** | Stay on tasks; try patient clinical URL. |
| **Expected** | No clinical data access. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Ch 5 — Specialty-wise doctor smoke

**Goal:** Har specialty pe consult open + save. Full clinical audit nahi — smoke OK.

**Per specialty mini steps:**
1. Login as Doctor with that specialty (catalog / profile).
2. Open `/prescriptions` → select patient.
3. Confirm specialty panel title is correct.
4. Fill 2–3 fields → save.
5. Confirm in Created Prescriptions.

### P0 specialties (must)

| TC-ID | Specialty | Panel check | Result | Notes |
|---|---|---|---|---|
| TC-SPEC-GM-01 | General Medicine | General Medicine / engine card | ☐ Pass ☐ Fail | |
| TC-SPEC-OBGYN-01 | Obstetrics & Gynaecology | Gynae / OBGYN UI (NOT Oncology) | ☐ Pass ☐ Fail | |
| TC-SPEC-PEDS-01 | Pediatrics | Pediatrics panel | ☐ Pass ☐ Fail | Use pediatric patient |
| TC-SPEC-CARD-01 | Cardiology | Cardiology | ☐ Pass ☐ Fail | |
| TC-SPEC-ORTHO-01 | Orthopaedics | Orthopaedics | ☐ Pass ☐ Fail | |
| TC-SPEC-ONCO-01 | Oncology | Oncology | ☐ Pass ☐ Fail | |
| TC-SPEC-PHYSIO-01 | Physiotherapy | Physio plan UI | ☐ Pass ☐ Fail | |
| TC-SPEC-EYE-01 | Ophthalmology | Eye / Ophthal | ☐ Pass ☐ Fail | |
| TC-SPEC-DENTAL-01 | Dental | Dental | ☐ Pass ☐ Fail | |
| TC-SPEC-ER-01 | Emergency | Emergency | ☐ Pass ☐ Fail | |

### P1 specialties (remaining)

| TC-ID | Specialty | Result | Notes |
|---|---|---|---|
| TC-SPEC-PULM-01 | Pulmonology | ☐ Pass ☐ Fail | |
| TC-SPEC-GASTRO-01 | Gastroenterology | ☐ Pass ☐ Fail | |
| TC-SPEC-HEP-01 | Hepatology | ☐ Pass ☐ Fail | |
| TC-SPEC-GSURG-01 | General Surgery | ☐ Pass ☐ Fail | |
| TC-SPEC-NEURO-01 | Neurology | ☐ Pass ☐ Fail | |
| TC-SPEC-NSURG-01 | Neurosurgery | ☐ Pass ☐ Fail | |
| TC-SPEC-NEO-01 | Neonatology | ☐ Pass ☐ Fail | |
| TC-SPEC-NEPH-01 | Nephrology | ☐ Pass ☐ Fail | |
| TC-SPEC-URO-01 | Urology | ☐ Pass ☐ Fail | |
| TC-SPEC-ENDO-01 | Endocrinology | ☐ Pass ☐ Fail | |
| TC-SPEC-DERM-01 | Dermatology | ☐ Pass ☐ Fail | |
| TC-SPEC-ENT-01 | ENT | ☐ Pass ☐ Fail | |
| TC-SPEC-RHEUM-01 | Rheumatology | ☐ Pass ☐ Fail | |
| TC-SPEC-PSY-01 | Psychiatry | ☐ Pass ☐ Fail | |
| TC-SPEC-ID-01 | Infectious Disease | ☐ Pass ☐ Fail | |
| TC-SPEC-ANES-01 | Anesthesiology | ☐ Pass ☐ Fail | |
| TC-SPEC-OTHER-01 | Other | ☐ Pass ☐ Fail | |

### TC-SPEC-REGRESS-01 — Gyne must not show as Oncology

| | |
|---|---|
| **Login as** | Doctor with Gynecologic Oncology / OBGYN mapping |
| **Steps** | Open consult for OBGYN patient/specialty. |
| **Expected** | Panel is OBGYN/Gynae — not Oncology-only template title. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Ch 6 — Cross-cutting negatives & smoke

### TC-MOD-001 — Laboratory module OFF

| | |
|---|---|
| **Preconditions** | Hospital Admin disables laboratory module; re-login tester |
| **Steps** | Open menu; try `/laboratory`. |
| **Expected** | Menu hidden; route blocked; API 403 MODULE_DISABLED. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | Re-enable after test |

### TC-MOD-002 — Ward module OFF

| | |
|---|---|
| **Steps** | Disable ward → re-login → try `/ward/home`. |
| **Expected** | Blocked. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-MOD-003 — Pharmacy module OFF

| | |
|---|---|
| **Steps** | Disable pharmacy → re-login → try `/pharmacy`. |
| **Expected** | Blocked. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-ROLE-001 — Edit system role → becomes hospital custom

| | |
|---|---|
| **Login as** | Hospital Admin |
| **Steps** | Roles → open system role (e.g. Nurse) → change one permission → Save. |
| **Expected** | Badge becomes Custom; toast says converted for this hospital; sync no longer overwrites. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-PRINT-001 — Print spot-check

| | |
|---|---|
| **Steps** | Print one Rx, one lab report/invoice, one discharge statement. |
| **Expected** | Readable; hospital name/patient correct; no blank critical fields. |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

### TC-AUTH-001 — Re-login after permission sync

| | |
|---|---|
| **Steps** | Admin syncs roles / changes perms → user refreshes without logout → then logout/login. |
| **Expected** | After re-login, new permissions apply (menus match). |
| **Result** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Master E2E scripts (run in order)

### Script A — OPD day
1. Receptionist: patient + appointment  
2. Doctor: prescription  
3. Pharmacy: issue  

Mark: TC-OPD-004

### Script B — Lab day
1. Lab Receptionist: create order  
2. Technician: sample + results  
3. Pathologist: verify  
4. Print report  

Mark: TC-LAB-006

### Script C — IPD day
1. Doctor: recommend admit  
2. Ward Receptionist: admit + bed  
3. Ward Admin: assign  
4. Nurse: vitals + MAR  
5. Discharge desk: discharge  

Mark: TC-WARD-010

---

## Sign-off

| Role | Name | Date | Overall |
|---|---|---|---|
| QA Tester | | | ☐ Pass ☐ Fail |
| Hospital Admin / Owner | | | ☐ Pass ☐ Fail |
| Build / version tested | | | |

**Failed TC-IDs to reopen:**

1. ________________________________
2. ________________________________
3. ________________________________

---

## Appendix — Quick URL cheat sheet

| Area | URL |
|---|---|
| Prescriptions | `/prescriptions` |
| Created Rx | `/prescriptions/created` |
| Appointments | `/appointments` |
| Patients | `/patients/all-patients` |
| Pharmacy | `/pharmacy` |
| Pharmacy POS | `/pharmacy/pos` |
| Lab dashboard | `/laboratory` |
| Create lab order | `/laboratory/create-order` |
| Lab reports | `/laboratory/created-reports` |
| Ward home | `/ward/home` |
| Ward admissions | `/ward/admissions` |
| Nurse my work | `/ward/my-work` |
| Attendant tasks | `/ward/tasks` |
| Roles | `/roles` |

---

*Generated for Hisaar360 HMS Phase P.1 live acceptance. Source: context.txt, ROLE_PERMISSION_MATRIX, PRODUCT_ACCEPTANCE_MATRIX.*
