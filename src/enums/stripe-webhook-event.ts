/**
 * Stripe webhook event types we handle.
 * @see https://docs.stripe.com/webhooks/event-types
 */
export enum StripeWebhookEventType {
    PaymentIntentSucceeded = 'payment_intent.succeeded',
}
