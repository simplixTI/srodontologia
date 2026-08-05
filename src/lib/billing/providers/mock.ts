import 'server-only';
import { randomBytes } from 'crypto';
import type { BillingProvider } from '../types';

/**
 * Mock billing provider — always "succeeds" and creates a hosted URL
 * that immediately confirms the checkout. Useful in dev/CI and for
 * customers on invoice-only plans.
 */
export function createMockBillingProvider(): BillingProvider {
  return {
    id: 'mock',
    displayName: 'Mock (offline)',
    async createCheckout(input) {
      const ref = `mock_${randomBytes(6).toString('hex')}`;
      return {
        provider: 'mock',
        externalRef: ref,
        hostedUrl: `${input.successUrl}?mock_ref=${ref}`
      };
    },
    async parseWebhook() {
      return { type: 'ignored', reason: 'mock provider does not receive webhooks' };
    },
    async cancelSubscription() {
      // no-op
    }
  };
}
