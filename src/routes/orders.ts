import type { FastifyInstance } from 'fastify';
import type { IOrdersService } from '../interfaces/orders.service.interface.js';
import type { CheckoutOrderResponse, OrderRequest } from '../dto/orders.dto.js';
import {
    InvalidWebhookSignatureError,
    OrderCreationFailedError,
    SeatsNotFoundError,
} from '../errors/orders.errors.js';

export interface OrdersRoutesOptions {
    ordersService: IOrdersService;
}

export async function ordersRoutes(app: FastifyInstance, opts: OrdersRoutesOptions) {
    const { ordersService } = opts; 
    app.post('/orders/checkout', async (request, reply) => {
        const body = request.body as OrderRequest;
        try {
            const result: CheckoutOrderResponse = await ordersService.checkOut(body);
            request.log.info({ orderId: result.orderId, userId: body.userId, eventId: body.eventId }, 'checkout completed');
            return reply.status(200).send(result);
        } catch (error) {
            if (error instanceof SeatsNotFoundError) {
                request.log.warn({ userId: body.userId, eventId: body.eventId, seatIds: body.seatIds }, 'checkout: seats not found');
                return reply.status(404).send({ message: error.message });
            }
            if (error instanceof OrderCreationFailedError) {
                request.log.error({ err: error, userId: body.userId, eventId: body.eventId }, 'checkout failed');
                return reply.status(500).send({ message: error.message });
            }
            if (error instanceof Error) {
                request.log.warn({ err: error }, 'checkout validation/error');
                return reply.status(400).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });

    // Stripe webhook: pass raw body and signature (use addContentTypeParser or rawBody plugin for this route)
    app.post('/orders/webhook', async (request, reply) => {
        const signature = (request.headers['stripe-signature'] as string) ?? '';
        const raw = (request as { rawBody?: string | Buffer }).rawBody;
        const body = raw ?? (typeof request.body === 'object' ? JSON.stringify(request.body ?? {}) : String(request.body ?? ''));
        const payload = { body, signature };
        try {
            const result = await ordersService.handleWebhook(payload);
            request.log.info({ received: result.received }, 'webhook handled');
            return reply.status(200).send(result);
        } catch (error) {
            if (error instanceof InvalidWebhookSignatureError) {
                request.log.warn('webhook rejected: invalid signature');
                return reply.status(401).send({ message: error.message });
            }
            if (error instanceof Error) {
                request.log.error({ err: error }, 'webhook handling failed');
                return reply.status(400).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });
}