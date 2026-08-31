# Hisaar360 HMS Module Implementation Audit

**IPD/Ward Flow status (2026-08-31): IMPLEMENTATION COMPLETE** — API 9/9, RBAC API 7/7, RBAC Browser PASS, Browser 28/28, backend tests 55/55, Angular build PASS.

Code audit of `hisaar360-hospital` (Angular) and `hisaar360-hospital-backend` (Express/MongoDB). Status is based on actual HTTP calls, Mongo writes, permissions, and final browser acceptance — not route or sidebar presence alone.

Date: 2026-08-28 (financial architecture) · Updated 2026-08-31 (IPD/Ward final acceptance)

## Status counts

| Status | Count |
| --- | --- |
| FULLY_IMPLEMENTED | HMS operational modules listed in this audit, including Accounts/GL, Purchases, Pharmacy encounter billing, Ward I/O, Ward inventory requisitions, Doctor Schedule, Pharmacy Dashboard, Ward dashboard KPIs |
| PARTIALLY_IMPLEMENTED | None of the HMS modules required by the financial implementation task |
| LEGACY_COMPATIBILITY | Legacy `bills` dual-write with LabOrder + Encounter ledger item; `/ward-admin` notes |
| TEMPLATE_LEFTOVER | Inbox, chat, charts, todo, filemanager, contacts, blog, social, covid-19, our-centers — **hidden/redirected** to dashboard; not implemented as product features |

See `HMS_FINANCIAL_ARCHITECTURE.md` and `HMS_FINANCIAL_INTEGRITY_REPORT.md`.

## Financial implementation notes

- General Ledger is the hospital accounting source of truth.
- Encounter Ledger remains the patient receivable subledger.
- Legacy Bills are invoice compatibility only and must not be summed with encounter charges as revenue.
- Purchases are mounted at `/api/v1/purchases` with `/pharmacy/purchases` UI.
- Pharmacy `settlementMode` COUNTER | ENCOUNTER is implemented; encounter sales do not auto-create visits.
- I/O Chart uses `ward_io_entries`. Ward inventory uses InventoryService `locationType=ward` plus `ward_requisitions`.
- `/our-staff` redirects to `/ward/nurses-staff`. `/doctors` redirects to `/all-doctors`.

Updated after a second pass over routes/services (calendar API, unused `getWardDashboard()`, encounter payment paths, unmounted purchases).

## Module table

| Module | Frontend Route | Frontend Component | API Called | Backend Route | Service | DB Collection | Permissions | Hospital Scoped | Status | Missing Pieces | Recommended Fix | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/dashboard` | `dashboard.component.ts` | `GET /api/v1/hospital-dashboard/summary` | `hospital-dashboard.routes.js` | `hospital-dashboard.service.js` | aggregations across appointments/bills/lab/prescriptions | dashboard.read / hospital scoped | YES | FULLY_IMPLEMENTED | None for summary cards | Keep using summary endpoint; do not add per-card GETs | P2 |
| Doctor Dashboard | `/doctor-dashboard` | `doctor-dashboard.component.ts` | `GET /api/v1/hospital-dashboard/doctor-summary` | `hospital-dashboard.routes.js` | `hospital-dashboard.service.js` | doctor-scoped aggregations | doctor dashboard | YES | FULLY_IMPLEMENTED | Unused DatePipe import | Cleanup only | P2 |
| Doctors | `/all-doctors`, `/add-doctors`, `/doctors-profile/:id` (`/doctors` → `/all-doctors`) | `all-doctors.component.ts`, `add-doctors.component.ts`, `doctors-profile.component.ts` | `GET/POST/PATCH/DELETE /api/v1/doctors`, `POST/DELETE /api/v1/doctors/:id/photo` | `doctor.routes.js` | `doctor.service.js` | `doctor_profiles` (+ `users` for login) | `doctors.create/read/update/delete` | YES | FULLY_IMPLEMENTED | Stub route redirected | — | P2 |
| Doctor Schedule | `/doctors-schedule` | `doctors-schedule.component.ts` → `fullcalender.component.ts` | `GET /api/v1/appointments/calendar`, doctor availability | `appointment.routes.js` | `appointment.service.js` | `appointments`, `doctor_profiles` | `doctors.read` / appointments | YES | FULLY_IMPLEMENTED | Travel/Important/Work and Events stub removed; availability + appointments shown | Slot uniqueness enforced server-side | P1 |
| Appointments | `/appointments` | `appointment.component.ts` | `GET/POST/PATCH /api/v1/appointments` | `appointment.routes.js` | `appointment.service.js` | `appointments` | `appointments.*` | YES | FULLY_IMPLEMENTED | — | — | P1 |
| Clinical Records | `/clinical-records` | clinical records component under client | `GET /api/v1/patient-history`, encounters | `patient-history.routes.js`, `encounter.routes.js` | `patient-history.service.js` | `patienthistories`, `encounters` | `patients.read` / history | YES | FULLY_IMPLEMENTED | Keep; this is clinical notes, not header Notes | — | P0 |
| Prescriptions | `/prescriptions`, `/prescriptions/created` | `prescription.component.ts`, `created-prescriptions.component.ts` | `GET/POST/PATCH /api/v1/prescriptions` | `prescription.routes.js` | `prescription.service.js` | `prescriptions` | `prescriptions.*` | YES | FULLY_IMPLEMENTED | — | — | P0 |
| Patients | `/patients/all-patients`, `/patients/add-patient`, `/patients/patient-profile/:id` (`/patients` → `/patients/all-patients`) | patient components | `GET/POST/PATCH /api/v1/patients` | `patient.routes.js` | `patient.service.js` | `patients` | `patients.*` | YES | FULLY_IMPLEMENTED | Stub route redirected | — | P0 |
| Departments | `/departments` | `departments.component.ts` | `GET/POST/PATCH/DELETE /api/v1/departments` | `department.routes.js` | `department.service.js` | `departments` | `departments.*` | YES | FULLY_IMPLEMENTED | — | Frontend lookup cache now invalidates after mutations | P2 |
| Laboratory | `/laboratory`, `/laboratory/create-order`, `/laboratory/orders/:id`, `/laboratory/catalog`, `/laboratory/settings` | `lab-dashboard.component.ts`, `lab-order-create.component.ts`, `lab-order-detail.component.ts`, `lab-test-catalog.component.ts`, `lab-settings.component.ts` | `/api/v1/laboratory/*` | `lab.routes.js` | `lab.service.js` | lab orders/catalog/settings + legacy `bills` + encounter ledger | lab permissions | YES | FULLY_IMPLEMENTED | Still posts to legacy Bill **and** Encounter Ledger by design | Do not remove `/bills` | P0 |
| Ward & Nursing | `/ward`, `/ward/dashboard` | `ward-dashboard.component.ts` | `GET /ward/dashboard` + beds/rooms/allotments (~5 calls) | `ward.routes.js` | `ward.service.js` `getWardDashboard` | multi | ward read | YES | FULLY_IMPLEMENTED | KPI cards from summary endpoint; bed map still uses rooms/allotments/beds | Do not add a second dashboard route | P1 |
| Bed Management | `/ward/bed-management` | `ward-bed-management.component.ts` | `GET/POST/PATCH /api/v1/ward/beds`, rooms, hospital-wards | `ward.routes.js`, `room.routes.js` | `ward.service.js` | `wardbeds`, `rooms` | bed write / ward read | YES | FULLY_IMPLEMENTED | — | — | P0 |
| Ward Admissions | `/ward/admissions`, `/ward/patient-list` | `ward-module-page.component.ts`, `ward-patient-list.component.ts` | room allotments + `POST /api/v1/ward/admissions` | `ward.routes.js`, `room-allotment.routes.js` | `ward.service.js` | `roomallotments` | ward write | YES | FULLY_IMPLEMENTED | Module page also maps `admission_request` activities | — | P0 |
| Nursing Care | `/ward/nursing-care` | `ward-module-page.component.ts` | `GET/POST /api/v1/ward/activities` + patient-history | `ward.routes.js` | `ward.service.js` | `wardactivities`, patient history | ward write | YES | FULLY_IMPLEMENTED | Legitimate clinical notes — do not confuse with header Notes | — | P0 |
| MAR | `/ward/mar` | `ward-module-page.component.ts` | `POST /api/v1/ward/...` dose + prescriptions | `ward.routes.js` | `ward.service.js` (`recordWardDose`) | `wardactivities` (mar_dose), `prescriptions` | ward write | YES | FULLY_IMPLEMENTED | Rapidly changing; not cached | — | P0 |
| Drips / IV | `/ward/drips-iv` | `ward-module-page.component.ts` | drip update APIs + prescriptions | `ward.routes.js` | `ward.service.js` (`updateWardDrip`) | prescriptions + activities | ward write | YES | FULLY_IMPLEMENTED | — | — | P0 |
| Vitals | `/ward/vitals` | `ward-module-page.component.ts` | `POST` ward vitals + history | `ward.routes.js` | `ward.service.js` (`recordWardVitals`) | patient history / activities | ward write | YES | FULLY_IMPLEMENTED | Not cached | — | P0 |
| I/O Chart | `/ward/io-chart` | `ward-module-page.component.ts` | `GET/POST /api/v1/ward/io` | `ward.routes.js` | `ward.service.js` | `ward_io_entries` | ward write | FULLY_IMPLEMENTED | Intake/output totals by shift and 24h; not billed | Corrections via audit metadata | P1 |
| Orders / Services | `/ward/orders-services` | `ward-module-page.component.ts` | `POST /api/v1/ward/orders`; ack/complete `/ward/activities/:id/*`; may create lab order | `ward.routes.js` | `ward.service.js` | `ward_activities`, `laborders` | lab/ward create | FULLY_IMPLEMENTED | Composite of lab + nursing tasks | Keep as composed view | P2 |
| Shift Handover | `/ward/shift-handover` | `ward-module-page.component.ts` | `wardactivities` `activityType=handover` | `ward.routes.js` | `ward.service.js` | `wardactivities` | ward write | FULLY_IMPLEMENTED | Clinical handover — keep | — | P0 |
| Ward Inventory | `/ward/inventory` | `ward-module-page.component.ts` | Inventory `locationType=ward` + `GET/POST /ward/requisitions` | `ward.routes.js`, `inventory.routes.js` | `ward.service.js`, `inventory.service.js` | `inventories`, `ward_requisitions`, `stockmovements` | ward + inventory | YES | FULLY_IMPLEMENTED | Requisition → issue → receive/consume via InventoryService | No second stock engine | P2 |
| Ward Reports | `/ward/reports` | `ward-module-page.component.ts` | `GET /api/v1/ward/reports` | `ward.routes.js` | `ward.service.js` `getWardReports` | aggregations | ward read | YES | FULLY_IMPLEMENTED | Occupancy, MAR, I/O, stock, handovers | Frontend uses report endpoint, not client-side collection counts | P1 |
| Nurses / Staff | `/ward/nurses-staff` (`/our-staff` redirects here) | `our-staff.component.ts` | `GET /api/v1/ward/staff`; `PATCH /room-allotments/:id/assign-nurse` | `ward.routes.js`, `room-allotment.routes.js` | `ward.service.js`, `user.service.js` | `hms_user_profiles` / `users` | ward + allotment | YES | FULLY_IMPLEMENTED | Exact role match (`nurse`, `staff nurse`, `ward admin`); no Staff collection | Photos on user/profile | P1 |
| Room Allotment | `/room-allotment`, `/room-allotment/alloted-rooms` | room allotment components | `GET/POST/PATCH /api/v1/room-allotments`, `/api/v1/rooms` | `room-allotment.routes.js`, `room.routes.js` | `room-allotment.service.js` | `roomallotments`, `rooms` | rooms/allotments | YES | FULLY_IMPLEMENTED | Shared with Ward admissions | Keep both UIs until migration | P1 |
| Payments | `/payments` | `payments.component.ts` | `GET /api/v1/encounters/patient-payments` | `encounter.routes.js` | `encounter.service.js` | `encounters`, `ledger_items`, `ledger_payments` | `encounters.read` / `ledger_payments.*` | YES | FULLY_IMPLEMENTED | Guard aligned to encounter permissions | — | P2 |
| Encounter Ledger | `/payments/ledger` | `encounter-ledger.component.ts` | `GET /api/v1/encounters/:id/ledger` | `encounter.routes.js` | `encounter.service.js` | encounter ledger items | billing | YES | FULLY_IMPLEMENTED | ENCOUNTER pharmacy sales post `sourceType=pharmacy` | COUNTER sales do not | P0 |
| Invoices | `/payments/invoices` | `invoices.component.ts` | `GET /api/v1/bills` | `bill.routes.js` | `bill.service.js` | `bills` | bills.read | YES | LEGACY | Intentionally kept; laboratory still writes bills | Do not delete `/bills` | P0 |
| Pharmacy Dashboard | `/pharmacy` | `pharmacy.component.ts` | `GET /sales/dashboard` + prescription fulfillment | `sale.routes.js` | `sale.service.js` | aggregations | `sales.read` / `products.read` | store/company | FULLY_IMPLEMENTED | KPI cards: sales, cash, returns, stock, pending Rx | One dashboard aggregation | P2 |
| Pharmacy POS | `/pharmacy/pos` | `pharmacy-pos.component.ts` | `POST /api/v1/sales` with `settlementMode` | `sale.routes.js` | `sale.service.js` | `sales` | `sales.create` | YES (store) | FULLY_IMPLEMENTED | COUNTER vs ENCOUNTER settlement | Requires open encounter for ENCOUNTER | P0 |
| Pharmacy Products | `/pharmacy/products` | `pharmacy-products.component.ts` | `GET/POST/PATCH /api/v1/products` + image upload | `product.routes.js` | `product.service.js` | `products` | `products.*` | company/hospital store | FULLY_IMPLEMENTED | Uses existing media-storage | — | P1 |
| Pharmacy Inventory | `/pharmacy/inventory` | `pharmacy-inventory.component.ts` | `GET /api/v1/inventory` | `inventory.routes.js` | `inventory.service.js` | inventory lots | `inventory.read` | YES | FULLY_IMPLEMENTED | — | — | P1 |
| Stock Movements | `/pharmacy/stock-movements` | `pharmacy-stock-movements.component.ts` | `/api/v1/stock-movements` | `stock-movement.routes.js` | `stock-movement.service.js` | `stockmovements` | inventory | YES | FULLY_IMPLEMENTED | — | — | P1 |
| Transfers | `/pharmacy/transfers` | `pharmacy-transfers.component.ts` | `/api/v1/transfers` | `transfer.routes.js` | `transfer.service.js` | `transfers` | inventory | YES | FULLY_IMPLEMENTED | — | — | P1 |
| Sales | `/pharmacy/sales` | `pharmacy-sales.component.ts` | `GET /api/v1/sales` | `sale.routes.js` | `sale.service.js` | `sales` | `sales.read` | YES | FULLY_IMPLEMENTED | Encounter posting when `settlementMode=ENCOUNTER` | — | P0 |
| Purchases | `/pharmacy/purchases`, `/pharmacy/purchases/create`, `/pharmacy/purchases/:id` | `pharmacy-purchases.component.ts` | `/api/v1/purchases` | `purchase.routes.js` | `purchase.service.js` | `purchases` | `purchases.*` | YES | FULLY_IMPLEMENTED | Mounted; DRAFT→RECEIVED; GL inventory/AP | Batch/expiry/free qty supported | P0 |
| Purchase Returns | `/pharmacy/purchase-returns` | `pharmacy-purchases.component.ts` | `/api/v1/returns` purchase returns | `return.routes.js` | `return.service.js` | purchase returns | `purchase_returns.create` | YES | FULLY_IMPLEMENTED | Stock + AP reversal | Original purchase retained | P1 |
| Accounts | `/accounts/*` | `accounts-page.component.ts`, `doctor-performance-page.component.ts` | `/api/v1/accounts/*` | `accounts.routes.js` | `accounts.service.js`, `posting.service.js`, `doctor-performance.service.js` | `accounts`, `journal_entries` | `accounts.*` | YES | FULLY_IMPLEMENTED | CoA, GL, cash/bank, AR/AP, TB, P&L, daily collections, reconciliation, patient profitability, doctor performance (dedicated page) | Doctor performance uses `/accounts/report-doctors` for dropdown names | P0 |
| Returns | `/pharmacy/returns/sales` | `pharmacy-sales-returns.component.ts` | `/api/v1/returns` | `return.routes.js` | `return.service.js` | sales returns | sales | YES | FULLY_IMPLEMENTED | — | — | P1 |
| Pharmacy Payments | `/pharmacy/payments` | `pharmacy-payments.component.ts` | payments APIs | `payment.routes.js` | `payment.service.js` | `payments` | payments | YES | FULLY_IMPLEMENTED | POS/pharmacy payments, not encounter ledger | — | P1 |
| Pharmacy Expenses | `/pharmacy/expenses` | `pharmacy-expenses.component.ts` | `/api/v1/expenses` | `expense.routes.js` | `expense.service.js` | `expenses` | expenses | YES | FULLY_IMPLEMENTED | — | — | P2 |
| Register Sessions | `/pharmacy/register-sessions` | `pharmacy-register-sessions.component.ts` | `/api/v1/register-sessions` | `register-session.routes.js` | `register-session.service.js` | `registersessions` | `register_sessions.*` | YES | FULLY_IMPLEMENTED | — | — | P1 |
| Pharmacy Reports | `/pharmacy/reports`, `/pos-reports` | `pos-reports.component.ts` | `/api/v1/reports` | `report.routes.js` | `report.service.js` | aggregations | reports.read | YES | FULLY_IMPLEMENTED | — | — | P2 |
| Users | `/users`, `/create-user` | `users.component.ts`, `create-user.component.ts` | `GET/POST/PATCH/DELETE /api/v1/users`, `POST/DELETE /api/v1/users/:id/photo` | `user.routes.js` | `user.service.js` | `hms_user_profiles` + legacy `users` | `users.*` | YES | FULLY_IMPLEMENTED | Canonical staff is HmsUserProfile; legacy User still listed | Do not create a Staff collection | P1 |
| Roles | `/roles` | `roles.component.ts` | `/api/v1/roles` | `role.routes.js` | `role.service.js` | `roles` | `roles.*` | company | FULLY_IMPLEMENTED | Lookup cache + invalidation added | — | P1 |
| Hospitals | `/hospitals` (admin) | hospital components | `/api/v1/hospitals` | `hospital.routes.js` | `hospital.service.js` | `hospitals` | `hospitals.*` | super-admin explicit | FULLY_IMPLEMENTED | — | — | P1 |
| Settings | `/settings` | `settings.component.ts` | hospital from `GET /auth/me` + lab settings | hospital + lab | hospital.service / lab.service | hospitals | settings | YES | FULLY_IMPLEMENTED | Legitimate HMS settings — not the floating gear | — | P0 |
| Audit Logs | `/audit-logs` | audit log component | `GET /api/v1/audit-logs` | `audit-log.routes.js` | `audit-log.service.js` | `auditlogs` | audit.read | YES | FULLY_IMPLEMENTED | Doctor/staff photo updates are not audited (doctor updates were not audited before) | Add audit only if product already audits user/doctor updates | P2 |
| Bills (legacy) | `/bills` (if routed) + invoices | invoices / lab | `GET/POST /api/v1/bills` | `bill.routes.js` | `bill.service.js` | `bills` | bills | YES | LEGACY | Required until billing migration | Do not remove | P0 |
| Ward Admin Notes | `/ward-admin` | `care-records.component.ts` | patient-history / care records | `patient-history.routes.js` | care-records | patient history | ward | YES | LEGACY | Free-text ward notes; **not** the header Notes popup | Preserve | P1 |
| Inbox | `/app-inbox` | inbox template | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo UI | Hide from HMS roles | P2 |
| Chat | `/app-chat` | chat template | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo UI | Hide from HMS roles | P2 |
| Charts | `/chartelement` | `charts.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo charts | Hide | P2 |
| Todo | `/todolist` | todo template | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| File manager | `/filemanager` | `filemanager.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| Contacts | `/contacts` | `contacts.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| Blog | `/blog` | `blog.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| Social | `/social` | `social.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| COVID-19 | `/covid-19` | `covid.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| Our Centers | `/our-centers` | `our-centers.component.ts` | none | none | none | none | none | NO | TEMPLATE_LEFTOVER | Demo | Hide | P2 |
| Our Staff (legacy route) | `/our-staff` | redirect | Redirects to `/ward/nurses-staff` | — | — | — | ward | YES | FULLY_IMPLEMENTED | Canonical page is nurses-staff | — | P2 |
| Header Notes (removed) | header | was `header.component.ts` | localStorage `mooli_notes` only | none | none | none | none | NO | TEMPLATE_LEFTOVER | Removed in this change | — | P0 |
| Theme customizer (removed) | floating gear | was `app.component.html` | sessionStorage Sidebar/GradientColor | none | none | none | none | NO | TEMPLATE_LEFTOVER | Gear, Buy this item, View Portfolio removed | Light sidebar/gradient defaults kept so HMS look is unchanged | P0 |

## Pharmacy sales → Encounter Ledger

Implemented.

- **COUNTER:** POS sale + pharmacy payment + GL (Pharmacy Counter AR / Pharmacy Revenue + COGS). No encounter charge.
- **ENCOUNTER:** Requires existing open encounter for the same patient/hospital. One `ledger_items` row `sourceType=pharmacy`, `sourceId=saleId`. No automatic counter collection. Sale posts COGS only; cashier payment later posts Dr Cash / Cr Patient AR.

Do not auto-create encounters from POS.

## Additional code findings (resolved in this pass)

| Finding | Resolution |
| --- | --- |
| Unused ward summary HTTP helper | Ward dashboard now calls `GET /ward/dashboard` for KPIs |
| Purchases module unmounted | Mounted at `/api/v1/purchases` with Angular `/pharmacy/purchases` |
| Stub list pages | `/doctors` → `/all-doctors`; `/patients` → `/patients/all-patients` |
| Duplicate `/our-staff` | Redirects to `/ward/nurses-staff` |
| Template leftovers | Inbox/Chat/Todo/etc. hidden and redirected to dashboard |
| Doctor Schedule chrome | Travel/Important/Work and Events stub removed |
| Payment guard `bills.read` | Route accepts `encounters.read` / `ledger_payments.read` |

## API optimization (this change)

| Page | Before | After |
| --- | --- | --- |
| Any guarded route | Repeat `GET /auth/me` | In-memory + in-flight `shareReplay` |
| Ward dashboard | Clinical bundle (~10+ GETs) | `GET /ward/dashboard` + beds/rooms/allotments (~5) |
| Ward reports | Bundle-derived zeros | `GET /ward/reports` |
| Pharmacy dashboard | Prescriptions + products + me | `GET /sales/dashboard` aggregation + fulfillment list |
| Accounts | Would have summed unrelated APIs | One accounts endpoint per view |
| Hospital dashboard revenue | Previously mixed operational totals | GL `accountCode` 40xx credits minus debits; consultation fees card is operational appointment paid fees only |

Dynamic MAR/vitals/nursing data is **not** cached.

## IPD/Ward module acceptance (2026-08-31)

| Module | Route(s) | Status | Final QA |
| --- | --- | --- | --- |
| Ward patient list / detail | `/ward/patient-list`, `/ward/patient-detail/:id` | FULLY_IMPLEMENTED | Browser PASS |
| Ward billing / payments / settlement | patient detail tabs | FULLY_IMPLEMENTED | Browser PASS |
| Medicine requests | Ward Medicines tab + `/pharmacy/ward-requests` | FULLY_IMPLEMENTED | API + Browser PASS |
| Pharmacy ward settlements | `/pharmacy/ward-settlements` | FULLY_IMPLEMENTED | API + Browser PASS |
| Procedures / operations | patient detail tabs | FULLY_IMPLEMENTED | Browser PASS |
| Discharge statement | patient detail tab | FULLY_IMPLEMENTED | Browser PASS |
| Duty roster | `/ward/duty-roster` | FULLY_IMPLEMENTED | Browser PASS |
| Ward RBAC | role templates + synced permissions | FULLY_IMPLEMENTED | API 7/7 + Browser PASS |

## Intentionally unchanged

- SSO / Central Auth / `HmsUserProfile`
- Laboratory dual-write to Bill + Encounter Ledger (GL from ledger item only)
- `/bills` and `/ward-admin` notes
- Hisaar360 branding, sidebar visual theme, permission enum style
- Template demo pages (not implemented as HMS modules)
