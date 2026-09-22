/**
 * E2E auth helpers. Credentials come from env — never hard-code production secrets.
 *
 * Required for live runs:
 *   E2E_BASE_URL          e.g. http://localhost:4200
 *   E2E_API_BASE_URL      e.g. http://localhost:3001/api/v1
 *   E2E_QA_PASSWORD       matches QA_TEST_PASSWORD used by ensure-qa-acceptance-users
 *
 * Optional per-role overrides: E2E_DOCTOR_EMAIL, E2E_NURSE_EMAIL, etc.
 */

import type { APIRequestContext, Page } from '@playwright/test';

export type E2eRole =
  | 'doctor'
  | 'nurse'
  | 'attendant'
  | 'admin'
  | 'pharmacy'
  | 'laboratory'
  | 'receptionist';

const DEFAULT_EMAILS: Record<E2eRole, string> = {
  doctor: 'qa.doctor@hisaar.test',
  nurse: 'qa.nurse@hisaar.test',
  attendant: 'qa.ward.attendant@hisaar.test',
  admin: 'qa.hospital.admin@hisaar.test',
  pharmacy: 'qa.pharmacy@hisaar.test',
  laboratory: 'qa.laboratory@hisaar.test',
  receptionist: 'qa.ward.receptionist@hisaar.test',
};

export const e2eEnabled = (): boolean => Boolean(process.env.E2E_BASE_URL?.trim());

export const e2eApiBase = (): string =>
  process.env.E2E_API_BASE_URL?.trim() || 'http://127.0.0.1:3001/api/v1';

export const e2eCredentials = (role: E2eRole): { email: string; password: string } => {
  const emailEnv: Record<E2eRole, string | undefined> = {
    doctor: process.env.E2E_DOCTOR_EMAIL,
    nurse: process.env.E2E_NURSE_EMAIL,
    attendant: process.env.E2E_ATTENDANT_EMAIL,
    admin: process.env.E2E_ADMIN_EMAIL,
    pharmacy: process.env.E2E_PHARMACY_EMAIL,
    laboratory: process.env.E2E_LAB_EMAIL,
    receptionist: process.env.E2E_RECEPTION_EMAIL,
  };
  return {
    email: emailEnv[role] || DEFAULT_EMAILS[role],
    password: process.env.E2E_QA_PASSWORD || process.env.QA_TEST_PASSWORD || 'password123',
  };
};

export type ApiSession = {
  token: string;
  refreshToken?: string;
  permissions: string[];
  roleName: string;
  user: Record<string, unknown>;
};

/** API login — used for fixture setup and negative security probes. */
export async function apiLogin(request: APIRequestContext, role: E2eRole): Promise<ApiSession> {
  const api = e2eApiBase();
  const { email, password } = e2eCredentials(role);
  const response = await request.post(`${api}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`API login failed for ${role} (${email}): ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  const data = body.data || body;
  const user = (data.user || {}) as Record<string, unknown>;
  const roleObj = (user.role || {}) as Record<string, unknown>;
  const permissions = Array.isArray(data.permissions)
    ? data.permissions
    : Array.isArray(user.permissions)
      ? (user.permissions as string[])
      : Array.isArray(roleObj.permissions)
        ? (roleObj.permissions as string[])
        : [];
  return {
    token: String(data.token || data.accessToken || ''),
    refreshToken: data.refreshToken ? String(data.refreshToken) : undefined,
    permissions,
    roleName: String(data.roleName || user.roleName || roleObj.name || role),
    user,
  };
}

/**
 * Authenticate in the SPA using the real /auth/login JWT (RBAC intact).
 * Prefers API login + session inject for stability (form button can be
 * intercepted by login-page chrome). Optionally exercises the local form first.
 */
export async function browserLogin(page: Page, role: E2eRole): Promise<void> {
  const { email, password } = e2eCredentials(role);
  const api = e2eApiBase();

  const response = await page.request.post(`${api}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`browserLogin API failed for ${role} (${email}): ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  const data = body.data || body;
  const user = (data.user || {}) as Record<string, unknown>;
  const roleObj = (user.role || {}) as Record<string, unknown>;
  const permissions = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : Array.isArray(roleObj.permissions)
      ? (roleObj.permissions as string[])
      : [];
  const roleName = String(user.roleName || roleObj.name || role);

  await page.goto('/login?localLogin=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, refreshToken, user, roleName, permissions }) => {
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', roleName);
      localStorage.setItem('roleId', String((user as { roleId?: string }).roleId || ''));
      localStorage.setItem('permissions', JSON.stringify(permissions));
    },
    {
      token: String(data.token || ''),
      refreshToken: data.refreshToken ? String(data.refreshToken) : undefined,
      user,
      roleName,
      permissions,
    }
  );

  const landing =
    role === 'attendant'
      ? '/ward/tasks'
      : role === 'nurse'
        ? '/ward/my-work'
        : role === 'laboratory'
          ? '/laboratory'
          : role === 'pharmacy'
            ? '/pharmacy'
            : role === 'receptionist'
              ? '/ward/admissions'
              : '/prescriptions';

  await page.goto(landing, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login') && !page.url().includes('localLogin')) {
    // Hosted portal redirect — stay on SPA by forcing local login then re-goto.
    await page.goto(`${landing}`, { waitUntil: 'domcontentloaded' });
  }
  if (page.url().includes('/login/access') || (page.url().includes('/login') && !page.url().includes(landing))) {
    // Retry once after storage is set
    await page.goto(landing, { waitUntil: 'networkidle' }).catch(() => page.goto(landing));
  }
}

/**
 * Inject API session into SPA storage then hard-navigate.
 * Prefer browserLogin; use this when form SSO redirect interferes.
 */
export async function injectSession(
  page: Page,
  request: APIRequestContext,
  role: E2eRole
): Promise<ApiSession> {
  const session = await apiLogin(request, role);
  await page.goto('/login?localLogin=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, refreshToken, user, roleName, permissions }) => {
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', roleName);
      localStorage.setItem('roleId', String((user as { roleId?: string }).roleId || ''));
      localStorage.setItem('permissions', JSON.stringify(permissions));
    },
    {
      token: session.token,
      refreshToken: session.refreshToken,
      user: session.user,
      roleName: session.roleName,
      permissions: session.permissions,
    }
  );
  return session;
}

export async function apiGet(
  request: APIRequestContext,
  path: string,
  token: string
): Promise<{ status: number; body: unknown }> {
  const response = await request.get(`${e2eApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status(), body };
}
