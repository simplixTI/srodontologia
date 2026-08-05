/**
 * Time abstraction.
 *
 * Business rules that depend on time (trial expiration, dunning stages,
 * LGPD 30-day grace, invitation expiry, session TTL) MUST use this Clock
 * instead of `new Date()` / `Date.now()`.
 *
 * Production uses `systemClock`. Tests inject `FakeClock` to travel through
 * time deterministically.
 */

export type Clock = {
  now(): Date;
  nowMs(): number;
  todayIso(): string;   // 'YYYY-MM-DD'
};

export const systemClock: Clock = {
  now: () => new Date(),
  nowMs: () => Date.now(),
  todayIso: () => new Date().toISOString().slice(0, 10)
};

export class FakeClock implements Clock {
  private current: number;

  constructor(seed: Date | string | number = new Date()) {
    this.current = new Date(seed).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  nowMs(): number {
    return this.current;
  }

  todayIso(): string {
    return new Date(this.current).toISOString().slice(0, 10);
  }

  /** Advances by N ms. Returns the new current time. */
  advance(ms: number): Date {
    this.current += ms;
    return this.now();
  }

  advanceHours(h: number): Date { return this.advance(h * 3_600_000); }
  advanceDays(d: number): Date { return this.advance(d * 86_400_000); }

  /** Sets absolute time. */
  set(t: Date | string | number): Date {
    this.current = new Date(t).getTime();
    return this.now();
  }
}

/**
 * Test helper: create a FakeClock at a fixed point.
 * ```ts
 * const clock = createFakeClock('2026-01-01T00:00:00Z');
 * ```
 */
export function createFakeClock(seed: Date | string | number = '2026-01-01T00:00:00Z'): FakeClock {
  return new FakeClock(seed);
}

// Module-level active clock: default is systemClock. Tests can swap via
// `setActiveClock(fake)` and restore with `resetActiveClock()`.
let _active: Clock = systemClock;

export function getClock(): Clock {
  return _active;
}

export function setActiveClock(c: Clock): void {
  _active = c;
}

export function resetActiveClock(): void {
  _active = systemClock;
}
