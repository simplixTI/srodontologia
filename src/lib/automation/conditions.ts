import type { DomainEvent } from '@/lib/events/types';

export type AutomationCondition = {
  field: string;                // dot-path in event.payload, e.g. 'quote.total'
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'exists' | 'not_exists';
  value?: unknown;
};

/**
 * Evaluates a list of conditions against an event's payload.
 * All conditions must pass (AND). Missing paths default to null.
 */
export function evaluateConditions(
  conditions: AutomationCondition[] | null | undefined,
  event: DomainEvent
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluate(c, event));
}

function evaluate(c: AutomationCondition, event: DomainEvent): boolean {
  const actual = getPath(event.payload, c.field);
  switch (c.op) {
    case 'eq':
      return equal(actual, c.value);
    case 'ne':
      return !equal(actual, c.value);
    case 'gt':
      return num(actual) > num(c.value);
    case 'gte':
      return num(actual) >= num(c.value);
    case 'lt':
      return num(actual) < num(c.value);
    case 'lte':
      return num(actual) <= num(c.value);
    case 'in':
      return Array.isArray(c.value) && c.value.some((v) => equal(actual, v));
    case 'contains':
      return typeof actual === 'string' && typeof c.value === 'string' && actual.includes(c.value);
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'not_exists':
      return actual === undefined || actual === null;
    default:
      return false;
  }
}

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
