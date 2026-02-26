import type {
    CreateOrderResponse,
    OrderRequest,
    WebhookHandledResponse,
} from '../dto/orders.dto.js';

export interface IOrdersRepository {
    create(order: OrderRequest): Promise<CreateOrderResponse>;
    handleWebhook(payload: {
        body: string | Buffer;
        signature: string;
    }): Promise<WebhookHandledResponse>;
}
