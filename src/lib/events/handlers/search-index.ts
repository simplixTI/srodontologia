import 'server-only';
import { registerEventHandler } from '../bus';
import { enqueueSearchReindex } from '@/lib/search/index-writer';

/**
 * Enqueues a search index refresh for entities that changed.
 * Case + message + file mutations bump the tsvector snapshot asynchronously.
 */
export function registerSearchIndexHandler(): void {
  registerEventHandler('.*' as `${string}.*`, async (event) => {
    if (event.aggregateType === 'case' || event.aggregateType === 'message') {
      await enqueueSearchReindex(event.organizationId, event.aggregateType, event.aggregateId);
    }
  }, 'searchIndexRefresh');
}
