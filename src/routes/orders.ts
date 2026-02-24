import type { FastifyInstance } from 'fastify';
import type { IOrdersService } from '../interfaces/orders.service.interface.js';
import type { CheckoutOrderResponse, OrderRequest } from '../dto/orders.dto.js';

export interface OrdersRoutesOptions {
    ordersService: IOrdersService;
}

export async function ordersRoutes(app: FastifyInstance, opts: OrdersRoutesOptions) {
    const { ordersService } = opts; 
    app.post('/orders/checkout', async (request, reply) => {
        const body = request.body as OrderRequest;
        try {
            const result: CheckoutOrderResponse = await ordersService.checkOut(body);
            return reply.status(200).send(result);
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(400).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });
}