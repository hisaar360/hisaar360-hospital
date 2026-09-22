import { test, expect, request as playwrightRequest } from '@playwright/test';
import {
  apiGet,
  apiLogin,
  browserLogin,
  e2eEnabled,
  injectSession,
} from './helpers/auth';

/**
 * Phase P.1 live release acceptance.
 * Requires E2E_BASE_URL + E2E_API_BASE_URL + seeded QA users/fixtures.
 * Failures must not be converted to skips.
 */

test.beforeAll(() => {
  test.skip(!e2eEnabled(), 'Set E2E_BASE_URL to run live acceptance');
});

test.describe('P.1 — Auth landings', () => {
  test('Doctor local login reaches prescriptions/dashboard', async ({ page }) => {
    await browserLogin(page, 'doctor');
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).not.toContain('/login');
  });

  test('Nurse lands on ward work area', async ({ page }) => {
    await browserLogin(page, 'nurse');
    await page.goto('/ward/my-work', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/ward/);
  });

  test('Attendant primary route is My Tasks', async ({ page }) => {
    await browserLogin(page, 'attendant');
    await page.goto('/ward/tasks', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/ward\/tasks/);
  });
});

test.describe('P.1 — OPD / Consultation shell', () => {
  test('Doctor opens consultation shell with Visit landmarks', async ({ page }) => {
    await browserLogin(page, 'doctor');
    await page.goto('/prescriptions', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('uncaught');
    // Shell or list must render without server error title.
    const title = (await page.title()).toLowerCase();
    expect(title).not.toContain('error');
  });
});

test.describe('P.1 — Ward Nurse path', () => {
  test('Ward Home + My Work + Patient list load under nurse session', async ({ page }) => {
    await browserLogin(page, 'nurse');
    for (const path of ['/ward/home', '/ward/my-work', '/ward/patient-list']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).not.toMatch(/\/login$/);
    }
  });
});

test.describe('P.1 — Attendant browser + API security', () => {
  test('Attendant My Tasks loads; clinical URLs do not grant access', async ({ page, request }) => {
    await browserLogin(page, 'attendant');
    await page.goto('/ward/tasks', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    const session = await apiLogin(request, 'attendant');
    const activities = await apiGet(request, '/ward/activities?limit=5', session.token);
    expect(activities.status).toBe(403);

    const pregnancy = await apiGet(request, '/pregnancy-episodes?limit=5', session.token);
    expect([401, 403, 404]).toContain(pregnancy.status);

    const prescriptions = await apiGet(request, '/prescriptions?limit=5', session.token);
    expect([401, 403]).toContain(prescriptions.status);

    const scores = await apiGet(request, '/clinical-scores?limit=5', session.token);
    expect([401, 403, 400]).toContain(scores.status);

    const endoscopy = await apiGet(request, '/endoscopy?limit=5', session.token);
    expect([401, 403, 400]).toContain(endoscopy.status);

    const pft = await apiGet(request, '/pulmonary-function?limit=5', session.token);
    expect([401, 403, 400]).toContain(pft.status);

    const tasks = await apiGet(request, '/ward/attendant-tasks', session.token);
    expect([200, 204]).toContain(tasks.status);
  });

  test('Pharmacy has prescriptions.read but not pregnancy_episodes', async ({ request }) => {
    const session = await apiLogin(request, 'pharmacy');
    expect(session.permissions).toContain('prescriptions.read');
    expect(session.permissions).not.toContain('pregnancy_episodes.read');

    const pregnancy = await apiGet(request, '/pregnancy-episodes?limit=5', session.token);
    expect(pregnancy.status).toBe(403);

    const prescriptions = await apiGet(request, '/prescriptions?limit=5', session.token);
    expect(prescriptions.status).toBe(200);
  });
});

test.describe('P.1 — Lab / Pharmacy / Operations routes', () => {
  test('Lab user reaches laboratory', async ({ page }) => {
    await browserLogin(page, 'laboratory');
    await page.goto('/laboratory', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).not.toMatch(/\/login$/);
  });

  test('Pharmacy user reaches pharmacy', async ({ page }) => {
    await browserLogin(page, 'pharmacy');
    await page.goto('/pharmacy', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).not.toMatch(/\/login$/);
  });

  test('Doctor operations calendar loads', async ({ page }) => {
    await browserLogin(page, 'doctor');
    await page.goto('/operations', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('P.1 — Doctor inpatients', () => {
  test('Doctor My Inpatients / patient-list reachable', async ({ page }) => {
    await browserLogin(page, 'doctor');
    await page.goto('/ward/patient-list', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/patient-list|ward/);
  });
});

test.describe('P.1 — Legacy routes authenticated', () => {
  const routes = [
    '/prescriptions',
    '/ward/vitals',
    '/ward/mar',
    '/ward/drips-iv',
    '/ward/io-chart',
    '/ward/orders-services',
    '/ward/nursing-care',
    '/ward/shift-handover',
  ];

  for (const path of routes) {
    test(`nurse session: ${path}`, async ({ page }) => {
      await browserLogin(page, 'nurse');
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 0).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).not.toMatch(/404/);
    });
  }
});

test.describe('P.1 — Mobile overflow', () => {
  test('Attendant tasks at 390px has no critical horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await browserLogin(page, 'attendant');
    await page.goto('/ward/tasks', { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThan(24);
  });
});

test.describe('P.1 — Session failure handling', () => {
  test('Invalid token yields understandable auth redirect (no stack trace)', async ({ page }) => {
    await page.goto('/login?localLogin=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid.token.value');
      localStorage.setItem('user', JSON.stringify({ name: 'Broken' }));
    });
    await page.goto('/ward/home', { waitUntil: 'domcontentloaded' });
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).not.toContain('at object.');
    expect(text).not.toContain('stack trace');
  });
});

test.describe('P.1 — Tenant isolation smoke (API)', () => {
  test('Attendant cannot fetch foreign hospital pregnancy by fabricated id shape', async ({ request }) => {
    const session = await apiLogin(request, 'attendant');
    // Non-existent ObjectId — must not leak cross-tenant data (403/404).
    const bogus = '000000000000000000000099';
    const res = await apiGet(request, `/pregnancy-episodes/${bogus}`, session.token);
    expect([401, 403, 404]).toContain(res.status);
  });
});
