import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../../src/app.js';
import type { IOrdersService } from '../../../src/interfaces/orders.service.interface.js';
import {
    InvalidWebhookSignatureError,
    OrderCreationFailedError,
    SeatsNotFoundError,
} from '../../../src/errors/orders.errors.js';

describe('Orders routes', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let mockOrdersService: IOrdersService;

    beforeEach(async () => {
        mockOrdersService = {
            checkOut: vi.fn(),
            handleWebhook: vi.fn(),
        };
        app = await buildApp({ ordersService: mockOrdersService });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    describe('POST /orders/checkout', () => {
        it('returns 200 and checkout result (happy path)', async () => {
            vi.mocked(mockOrdersService.checkOut).mockResolvedValue({
                clientSecret: 'secret_xxx',
                orderId: 'order-1',
            });
            const res = await app.inject({
                method: 'POST',
                url: '/orders/checkout',
                payload: { userId: 'u1', eventId: 'e1', seatIds: ['s1'], email: 'u@example.com' },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toMatchObject({ clientSecret: 'secret_xxx', orderId: 'order-1' });
        });

        it('returns 404 when SeatsNotFoundError', async () => {
            vi.mocked(mockOrdersService.checkOut).mockRejectedValue(new SeatsNotFoundError());
            const res = await app.inject({
                method: 'POST',
                url: '/orders/checkout',
                payload: {
                    userId: 'u1',
                    eventId: 'e1',
                    seatIds: ['missing'],
                    email: 'u@example.com',
                },
            });
            expect(res.statusCode).toBe(404);
        });

        it('returns 500 when OrderCreationFailedError', async () => {
            vi.mocked(mockOrdersService.checkOut).mockRejectedValue(
                new OrderCreationFailedError('Stripe failed')
            );
            const res = await app.inject({
                method: 'POST',
                url: '/orders/checkout',
                payload: { userId: 'u1', eventId: 'e1', seatIds: ['s1'], email: 'u@example.com' },
            });
            expect(res.statusCode).toBe(500);
            expect(res.json()).toMatchObject({ message: 'Stripe failed' });
        });

        it('returns 400 when service throws generic Error', async () => {
            vi.mocked(mockOrdersService.checkOut).mockRejectedValue(new Error('Validation failed'));
            const res = await app.inject({
                method: 'POST',
                url: '/orders/checkout',
                payload: { userId: 'u1', eventId: 'e1', seatIds: ['s1'], email: 'u@example.com' },
            });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /orders/webhook', () => {
        it('returns 200 and result (happy path)', async () => {
            vi.mocked(mockOrdersService.handleWebhook).mockResolvedValue({ received: true });
            const res = await app.inject({
                method: 'POST',
                url: '/orders/webhook',
                payload: { type: 'payment_intent.succeeded' },
                headers: { 'stripe-signature': 'sig' },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual({ received: true });
        });

        it('returns 401 when InvalidWebhookSignatureError', async () => {
            vi.mocked(mockOrdersService.handleWebhook).mockRejectedValue(
                new InvalidWebhookSignatureError()
            );
            const res = await app.inject({
                method: 'POST',
                url: '/orders/webhook',
                payload: {},
                headers: { 'stripe-signature': 'invalid' },
            });
            expect(res.statusCode).toBe(401);
        });

        it('returns 400 when service throws generic Error', async () => {
            vi.mocked(mockOrdersService.handleWebhook).mockRejectedValue(new Error('Parse error'));
            const res = await app.inject({
                method: 'POST',
                url: '/orders/webhook',
                payload: {},
                headers: { 'stripe-signature': 'sig' },
            });
            expect(res.statusCode).toBe(400);
        });
    });
});
