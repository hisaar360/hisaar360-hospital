# HMS Admission Order Flow

## Canonical business flow

1. **OPD appointment** → Doctor consultation / prescription
2. **Doctor creates Admission Recommendation** (`POST /ward-billing/admission-recommendations`)
   - Clinical order only
   - No room/bed assignment
   - No RoomAllotment
   - No admission Encounter
   - No patient ledger charge, payment, or GL journal
3. **Ward Receptionist** sees pending orders under **Ward → Admissions → Pending Orders**
4. **Review & Admit** opens read-only doctor order + existing **Add Room Allotment** form
5. **Actual admission** via existing `POST /room-allotments` with `admissionRecommendationId`
   - Creates one RoomAllotment
   - Creates one Encounter `type=admission`
   - Existing advance/security workflow unchanged
6. Recommendation status → `admitted`, linked with `roomAllotmentId`, `admissionEncounterId`, `admissionNo`
7. Patient appears in Ward Patient List / Bed Board / Ward Patient Detail
8. Ward staff read **Admission Order / Initial Plan**; execution uses existing Ward/Lab/Pharmacy modules

## Lifecycle states

`draft` → `pending` (recommended) → `acknowledged` → `admitted` | `cancelled` | `declined`

## Linking rules

- Recommendation links: `patientId`, `sourceAppointmentId`, `sourceEncounterId`, `prescriptionId`, `recommendedByDoctorId`
- RoomAllotment links: `admissionRecommendationId`, `recommendedByDoctorId`, `sourceAppointmentId`
- Idempotent admit: if recommendation already `admitted` with `roomAllotmentId`, repeat room-allotment create returns existing allotment

## RBAC

- **Doctor**: recommend, draft, edit before admission, print, cancel (policy)
- **Ward Receptionist**: read queue, acknowledge, admit, allocate room/bed; cannot edit doctor clinical content
- **Nurse/Ward staff**: read admission plan after admission

## Financial safety

Admission Recommendation creates **zero** ledger items, payments, or GL journals. Financial posting remains on actual admission and downstream Ward/IPD modules only.
