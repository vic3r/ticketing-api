import type {
    CreateOrderResponse,
    OrderRequest,
    WebhookHandledResponse,
} from '../dto/orders.dto.js';

export interface PaymentSucceededPayload {
    paymentIntentId: string;
    userId: string;
    eventId: string;
    seatIds: string[];
}

export interface IOrdersRepository {
    create(order: OrderRequest): Promise<CreateOrderResponse>;
    handleWebhook(payload: {
        body: string | Buffer;
        signature: string;
    }): Promise<WebhookHandledResponse>;
    /** Process a successful payment (mark order paid, seats sold, create tickets). Used by Kafka consumer. */
    processPaymentSucceeded(payload: PaymentSucceededPayload): Promise<void>;
}
