import { describe, it, expect } from 'vitest';
import { FakeClock, createFakeClock, systemClock } from '../src/lib/time/clock';

describe('Clock abstraction', () => {
  it('systemClock returns current time', () => {
    const before = Date.now();
    const t = systemClock.nowMs();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThan(before + 1000);
  });

  it('FakeClock is deterministic', () => {
    const c = createFakeClock('2026-01-01T00:00:00Z');
    expect(c.todayIso()).toBe('2026-01-01');
    expect(c.nowMs()).toBe(new Date('2026-01-01T00:00:00Z').getTime());
  });

  it('advanceDays moves forward', () => {
    const c = createFakeClock('2026-01-01T00:00:00Z');
    c.advanceDays(30);
    expect(c.todayIso()).toBe('2026-01-31');
  });

  it('advance and set are independent', () => {
    const c = new FakeClock('2026-01-01T12:00:00Z');
    c.advanceHours(6);
    expect(c.now().toISOString()).toBe('2026-01-01T18:00:00.000Z');
    c.set('2026-06-15T00:00:00Z');
    expect(c.todayIso()).toBe('2026-06-15');
  });
});
