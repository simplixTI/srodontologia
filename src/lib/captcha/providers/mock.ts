import 'server-only';
import type { CaptchaProvider } from '../types';

/**
 * Mock CAPTCHA — always accepts the fixed token "e2e-bypass". Any other
 * token is rejected. Used when no provider is configured and in E2E tests.
 * Never accepts empty tokens.
 */
export function createMockCaptchaProvider(): CaptchaProvider {
  return {
    id: 'mock',
    displayName: 'Mock CAPTCHA',
    siteKey: 'mock-site-key',
    async verify({ token }) {
      if (!token) return { ok: false, provider: 'mock', reason: 'empty_token' };
      if (token === 'e2e-bypass') return { ok: true, provider: 'mock' };
      return { ok: false, provider: 'mock', reason: 'mock_reject' };
    }
  };
}
