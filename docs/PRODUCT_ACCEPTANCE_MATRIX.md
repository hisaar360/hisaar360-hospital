# Product acceptance matrix (Phase P)

| Module | Status | Canonical owner | Unit/API tested | E2E | Production blocker? |
|---|---|---|---|---|---|
| Authentication / SSO | Ready | Central Auth + hospital users | Y | Smoke | Confirm portal URL per env |
| Patients | Ready | Patient | Y | Smoke | No |
| Appointments | Ready | Appointment | Y | Smoke | No |
| Clinical Workspace | Ready | Prescription + specialty engine | Y | Smoke | No |
| Specialties (frozen) | Ready | specialtyKey templates | Y (pure) | Sample | No new specialties |
| PregnancyEpisode | Ready | pregnancy_episodes | Y | Partial | Permission sync |
| Laboratory | Ready | Lab orders/results | Y | Smoke | No |
| Pharmacy | Ready | Products/Sales | Y | Smoke | No |
| Admission recommendation | Ready | AdmissionRecommendation | Y | Manual | No |
| Room / Bed | Ready | RoomAllotment + WardBed | Y | Manual | No |
| Ward Home / Workspace | Ready | Ward aggregation + activities | Y | Smoke | No |
| MAR | Ready | Ward MAR / WardActivity | Y | Manual | No |
| Drips / I-O | Ready | Ward drip + IO | Y | Manual | No |
| Handover | Ready | WardActivity handover | Y | Manual | No |
| Ward Attendant | Ready | WardActivity + metadata.taskType | Y | API E2E | Role sync |
| OperationSchedule | Ready | Operation + safetyCheck | Y | Smoke | No |
| Discharge | Ready | Encounter / allotment | Y | Manual | No |
| Billing / Ledger | Ready | Encounter ledger | Y | — | No redesign |
| Print | Ready | HMS documents | Partial | Smoke | Visual spot-check |

**Legend:** Manual = requires live hospital session with fixtures; Smoke = route/API reachability.

**Manual workbook:** [QA_TEST_CASES_HISAAR360.md](./QA_TEST_CASES_HISAAR360.md) · [PDF](./QA_TEST_CASES_HISAAR360.pdf) — role-wise E2E (OPD→Pharmacy, Lab, Ward admit→discharge) + specialty smoke.
