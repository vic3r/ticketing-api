import type { CreateOrderResponse, OrderRequest } from '../dto/orders.dto.js';

export interface IOrdersRepository {
    create(order: OrderRequest): Promise<CreateOrderResponse>;
}