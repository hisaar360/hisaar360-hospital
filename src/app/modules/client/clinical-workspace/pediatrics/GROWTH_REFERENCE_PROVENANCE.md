# Growth reference data provenance (H.1 / I.1)

## Runtime profiles

| Profile ID | Name | Version | Completeness |
|------------|------|---------|--------------|
| `WHO_CGS_2006` | WHO Child Growth Standards | 2006 | `complete_monthly_for_declared_indicators` |
| `WHO_GR_2007` | WHO Growth Reference | 2007 | `complete_monthly_for_declared_indicators` |

Declared indicators and age ranges live in:

`src/app/modules/client/clinical-workspace/pediatrics/growth-reference.manifest.ts`

Production LMS tables:

`growth-reference.production-data.ts`

Test-only sparse fixtures (never default runtime):

`growth-reference.fixtures.ts`

## Source of LMS parameters

Production tables are **bundled, offline LMS parameter tables** expanded to consecutive completed months from published WHO Child Growth Standards (2006) and WHO Growth Reference (2007) LMS-style anchors.

- Runtime does **not** scrape WHO/CDC websites.
- Unsupported age/indicator/mode → `eligible: false`, reason `Reference data not available` (H.1).
- No fabricated percentiles outside declared monthly coverage.

## Redistribution / licensing review status

**Compliance debt — not cleared for unconditional redistribution claims.**

Hisaar360 has **not** completed a formal legal/provenance review confirming redistribution rights for bundling full WHO LMS parameter tables in product builds for all deployment jurisdictions.

Until that review is completed and recorded:

1. Do **not** claim “official WHO-certified redistribution” in marketing or regulatory filings.
2. Treat bundled tables as **internal clinical decision-support reference data** with explicit profile/version metadata on every derived result.
3. Hospitals may later replace/select reference packs via configuration once licensed datasets are available.
4. Release managers must track this item as **open compliance debt** before markets that require verified redistribution authorization.

## Checksum / version tracking

- Manifest `version` fields: `2006` / `2007`
- Dataset kind on results: `production` | `test_fixtures`
- When replacing production tables, bump an internal `PRODUCTION_LMS_BUILD` comment/constant in `growth-reference.production-data.ts` and record a content hash in release notes.

## Safety unchanged from H.1

- Exact month or adjacent Δ=1 interpolation only
- Length vs height mode required when indicated
- Head circumference age-limited
- Test fixtures cannot masquerade as production-complete data
