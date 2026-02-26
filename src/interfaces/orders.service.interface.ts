import type {
    CreateOrderResponse,
    OrderRequest,
    WebhookHandledResponse,
} from '../dto/orders.dto.js';

export interface WebhookPayload {
    body: string | Buffer;
    signature: string;
}

export interface IOrdersService {
    checkOut(orderRequest: OrderRequest): Promise<CreateOrderResponse>;
    handleWebhook(payload: WebhookPayload): Promise<WebhookHandledResponse>;
}
