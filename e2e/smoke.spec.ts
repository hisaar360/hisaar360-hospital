import { test, expect } from '@playwright/test';
import { browserLogin, e2eEnabled } from './helpers/auth';

/**
 * Smoke suite. Authenticated journeys live in live-acceptance.spec.ts.
 */

const live = e2eEnabled();

test.describe('Phase P — environment gate', () => {
  test('documents when live E2E is disabled', () => {
    if (!live) {
      test.info().annotations.push({
        type: 'note',
        description:
          'E2E_BASE_URL unset — live browser flows are skipped. Set E2E_BASE_URL and seed QA users to enable.',
      });
    }
    expect(true).toBeTruthy();
  });
});

test.describe('Phase P — legacy route smoke', () => {
  test.skip(!live, 'Requires E2E_BASE_URL');

  const routes = [
    '/prescriptions',
    '/ward/home',
    '/ward/vitals',
    '/ward/mar',
    '/ward/drips-iv',
    '/ward/io-chart',
    '/ward/orders-services',
    '/ward/nursing-care',
    '/ward/shift-handover',
    '/ward/tasks',
    '/ward/my-work',
    '/ward/patient-list',
  ];

  for (const path of routes) {
    test(`loads or redirects without 404/500: ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      // Unauthenticated apps redirect to login/portal — still must not 404/500.
      expect(response?.status() ?? 0).toBeLessThan(500);
      expect(response?.status() ?? 0).not.toBe(404);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Phase P — mobile viewport', () => {
  test.skip(!live, 'Requires E2E_BASE_URL');

  test('ward tasks page has no critical horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await browserLogin(page, 'attendant');
    await page.goto('/ward/tasks', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThan(24);
  });
});
