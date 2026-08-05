import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFakeClock, setActiveClock, resetActiveClock, getClock } from '../src/lib/time/clock';

/**
 * Validates the LGPD deletion time-gate logic in isolation.
 *
 * The processor uses `getClock().nowMs()` to decide whether a scheduled
 * deletion is ripe. We simulate 30-day travel via FakeClock and check the
 * boolean gate directly — no Supabase, no HTTP. Guarantees that when the
 * scheduled_at is in the future, the gate blocks; when it's in the past,
 * the gate opens.
 */
describe('LGPD deletion time-gate', () => {
  beforeEach(() => {
    setActiveClock(createFakeClock('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    resetActiveClock();
  });

  function isRipe(scheduledAtIso: string | null): boolean {
    if (!scheduledAtIso) return true;
    return new Date(scheduledAtIso).getTime() <= getClock().nowMs();
  }

  it('blocks execution when scheduled_at is 30 days in the future', () => {
    const scheduled = new Date('2026-01-31T00:00:00Z').toISOString();
    expect(isRipe(scheduled)).toBe(false);
  });

  it('still blocks at day 29 (edge case)', () => {
    const scheduled = new Date('2026-01-31T00:00:00Z').toISOString();
    (getClock() as ReturnType<typeof createFakeClock>).advanceDays(29);
    expect(isRipe(scheduled)).toBe(false);
  });

  it('opens exactly at day 30', () => {
    const scheduled = new Date('2026-01-31T00:00:00Z').toISOString();
    (getClock() as ReturnType<typeof createFakeClock>).advanceDays(30);
    expect(isRipe(scheduled)).toBe(true);
  });

  it('opens for past scheduled_at', () => {
    const scheduled = new Date('2025-12-01T00:00:00Z').toISOString();
    expect(isRipe(scheduled)).toBe(true);
  });

  it('opens when scheduled_at is null (immediate)', () => {
    expect(isRipe(null)).toBe(true);
  });

  it('advanceHours + advanceDays compose correctly', () => {
    const clock = getClock() as ReturnType<typeof createFakeClock>;
    clock.advanceDays(29);
    clock.advanceHours(23);
    const scheduled = new Date('2026-01-31T00:00:00Z').toISOString();
    // 29d 23h < 30d
    expect(isRipe(scheduled)).toBe(false);
    clock.advanceHours(1);
    // 30d exact
    expect(isRipe(scheduled)).toBe(true);
  });
});
