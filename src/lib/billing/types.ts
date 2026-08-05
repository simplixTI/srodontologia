export type BillingCycle = 'monthly' | 'yearly';

export type CreateCheckoutInput = {
  organizationId: string;
  planCode: string;
  cycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
};

export type CheckoutResult = {
  provider: string;
  externalRef: string | null;
  hostedUrl: string | null;
};

export type WebhookPayload = {
  headers: Record<string, string>;
  rawBody: string;
};

export type WebhookEvent =
  | { type: 'checkout.completed'; organizationId: string; planCode: string; cycle: BillingCycle; externalRef: string }
  | { type: 'invoice.paid'; organizationId: string; invoiceExternalRef: string; amount: number }
  | { type: 'invoice.payment_failed'; organizationId: string; invoiceExternalRef: string }
  | { type: 'subscription.cancelled'; organizationId: string; externalRef: string }
  | { type: 'ignored'; reason: string };

/**
 * Every billing adapter implements this. All methods are async so the
 * caller does not need to know if the provider makes network calls or not.
 */
export type BillingProvider = {
  id: string;
  displayName: string;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  parseWebhook(payload: WebhookPayload): Promise<WebhookEvent>;
  cancelSubscription(externalRef: string): Promise<void>;
};

export type PlanSnapshot = {
  id: string;
  code: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
};
