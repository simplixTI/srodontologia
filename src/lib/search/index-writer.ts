import 'server-only';
import { enqueueJob } from '@/lib/queue/enqueue';

/** Enqueues a search reindex for the given entity (dedup: caller's responsibility). */
export async function enqueueSearchReindex(
  organizationId: string,
  entityType: string,
  entityId: string
): Promise<void> {
  await enqueueJob({
    organizationId,
    kind: 'search_reindex',
    payload: { entity_type: entityType, entity_id: entityId },
    priority: 8
  });
}
