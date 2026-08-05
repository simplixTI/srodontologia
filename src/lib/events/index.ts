import 'server-only';
import { registerEventHandler, emitEvent, markEventProcessed } from './bus';
import type { DomainEvent, DomainEventType, DomainEventHandler } from './types';
import { registerAutomationHandler } from './handlers/automation';
import { registerSearchIndexHandler } from './handlers/search-index';
import { registerWebhookHandler } from './handlers/webhook';

let bootstrapped = false;

/** Registers every built-in handler exactly once per Node process. */
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  registerAutomationHandler();
  registerSearchIndexHandler();
  registerWebhookHandler();
}

export async function publishEvent(event: DomainEvent): Promise<string | null> {
  bootstrap();
  return emitEvent(event);
}

export {
  registerEventHandler,
  markEventProcessed,
  type DomainEvent,
  type DomainEventType,
  type DomainEventHandler
};
