import type { JobKind, JobProcessor } from './types';

const PROCESSORS = new Map<JobKind, JobProcessor>();

export function registerJobProcessor<T extends Record<string, unknown>>(
  kind: JobKind,
  processor: JobProcessor<T>
): void {
  PROCESSORS.set(kind, processor as JobProcessor);
}

export function getJobProcessor(kind: JobKind): JobProcessor | undefined {
  return PROCESSORS.get(kind);
}

export function listRegisteredKinds(): JobKind[] {
  return Array.from(PROCESSORS.keys());
}
