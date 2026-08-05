import { describe, it, expect } from 'vitest';
import { rateLimit } from '../src/lib/rate-limit';

describe('rate-limit in-memory', () => {
  it('allows up to max and blocks after', () => {
    const key = `test-${Math.random()}`;
    const opts = { max: 3, windowMs: 1000 };
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    const denied = rateLimit(key, opts);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});
