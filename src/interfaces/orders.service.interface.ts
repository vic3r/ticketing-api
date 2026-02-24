import type { CreateOrderResponse, OrderRequest } from '../dto/orders.dto.js';

export interface IOrdersService {
    checkOut(orderRequest: OrderRequest): Promise<CreateOrderResponse>;
}

