import { test, expect } from '@playwright/test';
import { browserLogin, e2eEnabled } from './helpers/auth';

/**
 * Thin clinical route shells. Full P.1 journeys live in live-acceptance.spec.ts.
 */

const live = e2eEnabled();

test.describe('Phase P — clinical route shells', () => {
  test.beforeEach(() => {
    test.skip(!live, 'Requires E2E_BASE_URL');
  });

  test('prescriptions route loads for doctor', async ({ page }) => {
    await browserLogin(page, 'doctor');
    await page.goto('/prescriptions', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect((await page.title()).toLowerCase()).not.toContain('error');
  });

  test('ward home and my-work load for nurse', async ({ page }) => {
    await browserLogin(page, 'nurse');
    await page.goto('/ward/home', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/ward/my-work', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('operations calendar loads for doctor', async ({ page }) => {
    await browserLogin(page, 'doctor');
    await page.goto('/operations', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('laboratory and pharmacy routes load for role users', async ({ page }) => {
    await browserLogin(page, 'laboratory');
    await page.goto('/laboratory', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    await browserLogin(page, 'pharmacy');
    await page.goto('/pharmacy', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
});
