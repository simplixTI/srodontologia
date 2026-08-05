import { test as base, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

/**
 * Fixture that generates a unique test user identity per test.
 * Actual DB provisioning is deferred to the individual test — we only
 * generate deterministic strings here to avoid collision.
 */
export type TestUser = {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  slug: string;
};

export const test = base.extend<{ testUser: TestUser }>({
  testUser: async ({}, use) => {
    const id = randomBytes(4).toString('hex');
    await use({
      email: `e2e+${id}@srdigital.local`,
      password: 'e2e-Strong-Pass-1!',
      fullName: `E2E Tester ${id}`,
      companyName: `Lab E2E ${id}`,
      slug: `lab-e2e-${id}`
    });
  }
});

export { expect };
