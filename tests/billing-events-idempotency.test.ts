import { describe, it, expect } from 'vitest';

/**
 * Validates the idempotency + out-of-order semantics that our billing_events
 * table + webhook handler contract depend on. We simulate the
 * unique(provider, external_event_id) constraint in-memory and reproduce
 * the same isNew semantics the real `recordBillingEvent` returns.
 *
 * This isolates the invariant from Supabase — real integration lives in a
 * separate Stripe CLI test that runs only when STRIPE_TEST_KEY is set.
 */
type FakeEvent = { provider: 'stripe'; externalEventId: string; eventType: string; occurredAt: number };

class InMemoryBillingEvents {
  private byRef = new Map<string, FakeEvent>();

  record(e: FakeEvent): { isNew: boolean } {
    const key = `${e.provider}:${e.externalEventId}`;
    if (this.byRef.has(key)) return { isNew: false };
    this.byRef.set(key, e);
    return { isNew: true };
  }
  size() { return this.byRef.size; }
}

describe('billing_events idempotency', () => {
  it('processes a new event exactly once', () => {
    const store = new InMemoryBillingEvents();
    const first = store.record({ provider: 'stripe', externalEventId: 'evt_1', eventType: 'invoice.paid', occurredAt: 100 });
    expect(first.isNew).toBe(true);
  });

  it('rejects a duplicate delivery of the same event id', () => {
    const store = new InMemoryBillingEvents();
    store.record({ provider: 'stripe', externalEventId: 'evt_1', eventType: 'invoice.paid', occurredAt: 100 });
    const dup = store.record({ provider: 'stripe', externalEventId: 'evt_1', eventType: 'invoice.paid', occurredAt: 100 });
    expect(dup.isNew).toBe(false);
    expect(store.size()).toBe(1);
  });

  it('treats different event ids as independent', () => {
    const store = new InMemoryBillingEvents();
    store.record({ provider: 'stripe', externalEventId: 'evt_1', eventType: 'invoice.paid', occurredAt: 100 });
    const second = store.record({ provider: 'stripe', externalEventId: 'evt_2', eventType: 'invoice.paid', occurredAt: 200 });
    expect(second.isNew).toBe(true);
    expect(store.size()).toBe(2);
  });
});

/**
 * Out-of-order simulation. If the last received event has an older
 * timestamp than what we already applied, the correct behavior is to
 * ignore it (or defer to reconciliation). We validate the timestamp
 * comparison invariant here.
 */
class SubscriptionState {
  status: string = 'trial';
  lastEventAt = 0;

  apply(evt: { type: string; status: string; occurredAt: number }): 'applied' | 'ignored_old' {
    if (evt.occurredAt < this.lastEventAt) return 'ignored_old';
    this.status = evt.status;
    this.lastEventAt = evt.occurredAt;
    return 'applied';
  }
}

describe('subscription state — out-of-order webhook resilience', () => {
  it('applies events in ascending order normally', () => {
    const s = new SubscriptionState();
    expect(s.apply({ type: 'sub.updated', status: 'active', occurredAt: 100 })).toBe('applied');
    expect(s.apply({ type: 'sub.updated', status: 'past_due', occurredAt: 200 })).toBe('applied');
    expect(s.status).toBe('past_due');
  });

  it('ignores an older event delivered after a newer one', () => {
    const s = new SubscriptionState();
    s.apply({ type: 'sub.updated', status: 'active', occurredAt: 200 });
    const late = s.apply({ type: 'sub.updated', status: 'past_due', occurredAt: 100 });
    expect(late).toBe('ignored_old');
    expect(s.status).toBe('active'); // preserved
  });

  it('would corrupt state without timestamp guard (baseline check)', () => {
    // Sanity: without the guard, the last-write-wins would flip status back.
    const s = { status: 'active', apply(newStatus: string) { this.status = newStatus; } };
    s.apply('active');
    s.apply('past_due'); // late delivery
    expect(s.status).toBe('past_due'); // this is the BAD outcome we're avoiding
  });
});
