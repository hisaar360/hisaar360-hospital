# Production release checklist (Hisaar360 Hospital)

Use this before promoting a build to a real hospital tenant.

## 1. Builds

- [ ] `ng build --configuration=development` passes
- [ ] `ng build --configuration=production` passes (component style budgets intentional)
- [ ] Backend has no pending destructive migrations

## 2. Tests

- [ ] Backend: `npm test` (node:test suite)
- [ ] Frontend ward pure: `node scripts/run-ward-pure-tests.mjs`
- [ ] Frontend specialty pure: `node scripts/run-specialty-pure-tests.mjs`
- [ ] Karma ward specs (Chrome Headless) when available
- [ ] Playwright: `npm run e2e` (with `E2E_BASE_URL` / `E2E_API_BASE_URL` against **test** tenant)
- [ ] Manual QA workbook: [docs/QA_TEST_CASES_HISAAR360.md](./QA_TEST_CASES_HISAAR360.md) / [PDF](./QA_TEST_CASES_HISAAR360.pdf) (role E2E + specialty smoke)

## 3. Role permission sync

```bash
cd hisaar360-hospital-backend
npm run sync:role-permissions -- --dry-run
# Review output — confirm Ward Attendant appears; custom roles untouched
npm run sync:role-permissions
npm run sync:role-permissions -- --dry-run
```

- [ ] Dry-run reviewed
- [ ] Applied
- [ ] Second dry-run shows no unexpected deltas

## 4. QA / demo users (test only)

```bash
QA_TEST_PASSWORD='…' npm run qa:ensure-users
```

Never use production credentials in E2E. Never commit passwords.

## 5. Seed safety

- [ ] Production `NODE_ENV=production` refuses `seed.js` unless `ALLOW_SEED=true`
- [ ] Specialty `DEMO_*` clinical records require `SEED_CLINICAL_DEMOS=true` in production (or are skipped when `SEED_CLINICAL_DEMOS=false`)
- [ ] Production bootstrap does **not** run clinical demos by default

## 6. Environment

Document without secrets:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` / DB config | Primary store |
| Auth / SSO portal URL | Central login |
| `apiBaseUrl` (FE prod) | Usually `/api/v1` |
| Object storage / S3 | Documents if enabled |
| `QA_TEST_PASSWORD` | Test tenants only |

## 7. Security smoke

- [ ] Ward Attendant: `/ward/attendant-tasks` OK; `/ward/activities` → 403
- [ ] Pharmacy `prescriptions.read` does **not** grant `pregnancy_episodes.*`
- [ ] Psychiatry fields absent from attendant + home-summary payloads
- [ ] Cross-hospital access denied on clinical modules

## 8. Functional smoke

- [ ] OPD consultation save / reopen
- [ ] Admission recommendation → bed → encounter
- [ ] Nurse Patient Workspace: vitals / MAR / IV-IO / note / handover
- [ ] Attendant Start → Done
- [ ] Operation laterality confirmation + safety phases
- [ ] Lab order → result (Lab canonical)
- [ ] Pharmacy dispense ≠ MAR given
- [ ] Discharge releases bed only after success

## 9. Rollback

- [ ] Previous FE artifact retained
- [ ] Previous BE deploy tag known
- [ ] DB backup taken before role sync / seed
- [ ] No destructive specialtyData migrations in this release

## 10. Sign-off

| Role | Name | Date |
|---|---|---|
| Engineering | | |
| Clinical champion | | |
| Hospital IT | | |
