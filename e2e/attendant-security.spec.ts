import { test, expect, request as playwrightRequest } from '@playwright/test';
import { apiGet, apiLogin, browserLogin, e2eEnabled } from './helpers/auth';

/**
 * Attendant least-privilege API acceptance (complements live-acceptance.spec.ts).
 * Login failures FAIL — never skip.
 */

const live = e2eEnabled();

test.describe('Phase P — Attendant API security', () => {
  test.beforeEach(() => {
    test.skip(!live && !process.env.E2E_API_BASE_URL?.trim(), 'Requires E2E_BASE_URL or E2E_API_BASE_URL');
  });

  test('attendant can list tasks but GET /ward/activities is 403', async () => {
    const ctx = await playwrightRequest.newContext();
    const session = await apiLogin(ctx, 'attendant');

    const tasks = await apiGet(ctx, '/ward/attendant-tasks', session.token);
    expect([200, 204]).toContain(tasks.status);

    const activities = await apiGet(ctx, '/ward/activities', session.token);
    expect(activities.status).toBe(403);
    test.info().annotations.push({
      type: 'evidence',
      description: `GET /ward/activities status=${activities.status}`,
    });

    const pregnancy = await apiGet(ctx, '/pregnancy-episodes', session.token);
    expect([401, 403]).toContain(pregnancy.status);

    const prescriptions = await apiGet(ctx, '/prescriptions?limit=1', session.token);
    expect([401, 403]).toContain(prescriptions.status);

    const lab = await apiGet(ctx, '/laboratory/orders?limit=1', session.token);
    expect([401, 403]).toContain(lab.status);

    await ctx.dispose();
  });

  test('nurse can GET /ward/activities when permitted', async () => {
    const ctx = await playwrightRequest.newContext();
    const session = await apiLogin(ctx, 'nurse');
    const activities = await apiGet(ctx, '/ward/activities?limit=5', session.token);
    expect([200, 204]).toContain(activities.status);
    await ctx.dispose();
  });
});

test.describe('Phase P — Pregnancy access matrix', () => {
  test.beforeEach(() => {
    test.skip(!live && !process.env.E2E_API_BASE_URL?.trim(), 'Requires E2E_BASE_URL or E2E_API_BASE_URL');
  });

  test('doctor OK; pharmacy and attendant denied', async () => {
    const ctx = await playwrightRequest.newContext();

    const doctor = await apiLogin(ctx, 'doctor');
    const doctorRes = await apiGet(ctx, '/pregnancy-episodes?limit=5', doctor.token);
    expect([200, 204]).toContain(doctorRes.status);

    const pharmacy = await apiLogin(ctx, 'pharmacy');
    const pharmacyRes = await apiGet(ctx, '/pregnancy-episodes?limit=5', pharmacy.token);
    expect([401, 403]).toContain(pharmacyRes.status);

    const attendant = await apiLogin(ctx, 'attendant');
    const attendantRes = await apiGet(ctx, '/pregnancy-episodes?limit=5', attendant.token);
    expect([401, 403]).toContain(attendantRes.status);

    await ctx.dispose();
  });
});

test.describe('Phase P — browser role landings', () => {
  test.beforeEach(() => {
    test.skip(!live, 'Requires E2E_BASE_URL');
  });

  test('attendant lands on My Tasks without clinical activity list', async ({ page }) => {
    await browserLogin(page, 'attendant');
    await page.goto('/ward/tasks', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/ward\/tasks/);
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text.includes('activity list') && text.includes('clinical notes')).toBeFalsy();
  });

  test('unauthenticated ward home does not crash', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/ward/home', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
});
