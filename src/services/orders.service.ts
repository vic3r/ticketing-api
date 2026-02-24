import type { OrderRequest } from '../dto/orders.dto.js';
import type { IOrdersRepository } from '../interfaces/orders.repository.interface.js';
import type { IOrdersService, WebhookPayload } from '../interfaces/orders.service.interface.js';

export const createOrdersService = (ordersRepository: IOrdersRepository): IOrdersService => {
    return {
        async checkOut(orderRequest: OrderRequest) {
            return ordersRepository.create(orderRequest);
        },
        async handleWebhook(payload: WebhookPayload) {
            return ordersRepository.handleWebhook(payload);
        },
    };
};