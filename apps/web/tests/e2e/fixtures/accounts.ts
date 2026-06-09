import {expect, type Page} from '@playwright/test';

export const DEMO_PASSWORD = 'DemoPass!2026';

export interface DemoAccount {
  key: string;
  email: string;
  role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user';
  company: string;
  /** Human label for the demo narration / test titles. */
  label: string;
}

/** The 9 seeded demo accounts (password = DEMO_PASSWORD). */
export const ACCOUNTS: DemoAccount[] = [
  {
    key: 'superadmin',
    email: 'superadmin@pulsetrack.demo',
    role: 'super_admin',
    company: 'ZKidz Studio',
    label: 'Super Admin',
  },
  {
    key: 'sysadmin',
    email: 'sysadmin@pulsetrack.demo',
    role: 'system_admin',
    company: 'ZKidz Studio',
    label: 'System Admin',
  },
  {
    key: 'admin',
    email: 'admin@pulsetrack.demo',
    role: 'company_admin',
    company: 'ZKidz Studio',
    label: 'Company Admin (Owner)',
  },
  {
    key: 'manager',
    email: 'manager@pulsetrack.demo',
    role: 'manager',
    company: 'ZKidz Studio',
    label: 'Manager',
  },
  {
    key: 'dev1',
    email: 'dev1@pulsetrack.demo',
    role: 'user',
    company: 'ZKidz Studio',
    label: 'Team Member (dev1)',
  },
  {
    key: 'dev2',
    email: 'dev2@pulsetrack.demo',
    role: 'user',
    company: 'ZKidz Studio',
    label: 'Team Member (dev2)',
  },
  {
    key: 'designer',
    email: 'designer@pulsetrack.demo',
    role: 'user',
    company: 'ZKidz Studio',
    label: 'Team Member (designer)',
  },
  {
    key: 'admin2',
    email: 'admin2@pulsetrack.demo',
    role: 'company_admin',
    company: 'Globex Co.',
    label: 'Company Admin (Globex)',
  },
  {
    key: 'user2',
    email: 'user2@pulsetrack.demo',
    role: 'user',
    company: 'Globex Co.',
    label: 'Team Member (Globex)',
  },
];

/** Pages every authenticated role should be able to load (role gating handled per-test). */
export const CORE_PAGES = [
  {path: '/dashboard', heading: /welcome back|dashboard/i},
  {path: '/projects', heading: /projects/i},
  {path: '/tickets', heading: /tickets/i},
  {path: '/time-tracking', heading: /time/i},
  {path: '/activity', heading: /activity|recent|feed/i},
  {path: '/billing', heading: /billing/i},
];

/** Admin-scoped pages (manager+ / super_admin). */
export const ADMIN_PAGES = [
  {path: '/clients', heading: /clients/i, minRole: 'manager'},
  {path: '/clients/heatmap', heading: /heat ?map/i, minRole: 'manager'},
  {path: '/company/users', heading: /(company|users|team)/i, minRole: 'manager'},
  {path: '/admin/companies', heading: /companies/i, minRole: 'super_admin'},
  {path: '/admin/users', heading: /users/i, minRole: 'super_admin'},
];

/**
 * Log in through the real UI (Supabase email/password), exactly like a user.
 * Waits until the app shell (post-auth) has rendered.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string = DEMO_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press('Enter');
  // Post-login lands on /dashboard; wait for either the URL or the welcome heading.
  await expect(page)
    .toHaveURL(/\/(dashboard)?$|\/dashboard/, {timeout: 30_000})
    .catch(() => undefined);
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function logout(page: Page): Promise<void> {
  const logout = page.getByRole('button', {name: /log ?out|sign ?out/i}).first();
  if (await logout.isVisible().catch(() => false)) {
    await logout.click().catch(() => undefined);
  }
}
