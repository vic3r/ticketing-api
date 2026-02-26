import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrdersRepository } from '../../../src/repositories/orders.repository.js';
import {
    InvalidWebhookSignatureError,
    OrderCreationFailedError,
    SeatsNotFoundError,
} from '../../../src/errors/orders.errors.js';

const dbMocks = vi.hoisted(() => ({
    selectFromWhere: vi.fn(),
    updateSetWhere: vi.fn(),
    insertValuesReturning: vi.fn(),
    insertValues: vi.fn(),
    queryOrdersFindFirst: vi.fn(),
    querySeatsFindMany: vi.fn(),
    queryTicketTiersFindMany: vi.fn(),
}));

const stripeMocks = vi.hoisted(() => ({
    paymentIntentsCreate: vi.fn(),
    webhooksConstructEvent: vi.fn(),
}));

vi.mock('../../../src/db/index.js', () => ({
    db: {
        select: () => ({
            from: () => ({
                where: () => Promise.resolve(dbMocks.selectFromWhere()),
            }),
        }),
        update: () => ({
            set: () => ({
                where: () => Promise.resolve(dbMocks.updateSetWhere()),
            }),
        }),
        insert: () => ({
            values: (v: unknown) => {
                const withReturning = () => Promise.resolve(dbMocks.insertValuesReturning());
                const withoutReturning = Promise.resolve(dbMocks.insertValues());
                return {
                    returning: withReturning,
                    then: withoutReturning.then.bind(withoutReturning),
                    catch: withoutReturning.catch.bind(withoutReturning),
                };
            },
        }),
        query: {
            orders: {
                findFirst: (opts: unknown) => dbMocks.queryOrdersFindFirst(opts),
            },
            seats: {
                findMany: (opts: unknown) => dbMocks.querySeatsFindMany(opts),
            },
            ticketTiers: {
                findMany: (opts: unknown) => dbMocks.queryTicketTiersFindMany(opts),
            },
        },
    },
}));

vi.mock('stripe', () => ({
    default: function StripeMock() {
        return {
            paymentIntents: {
                create: (params: unknown) => stripeMocks.paymentIntentsCreate(params),
            },
            webhooks: {
                constructEvent: (p: unknown, s: unknown, sec: unknown) =>
                    stripeMocks.webhooksConstructEvent(p, s, sec),
            },
        };
    },
}));

vi.mock('../../../src/db/schema.js', () => ({
    orders: {},
    eventSeats: {},
    seats: {},
    ticketTiers: {},
    tickets: {},
}));

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(() => 'mock-jwt-payload'),
    },
}));

describe('Orders repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dbMocks.selectFromWhere.mockResolvedValue([]);
        dbMocks.updateSetWhere.mockResolvedValue(undefined);
        dbMocks.insertValuesReturning.mockResolvedValue([]);
        dbMocks.insertValues.mockResolvedValue(undefined);
        dbMocks.queryOrdersFindFirst.mockResolvedValue(null);
        dbMocks.querySeatsFindMany.mockResolvedValue([]);
        dbMocks.queryTicketTiersFindMany.mockResolvedValue([]);
    });

    describe('processPaymentSucceeded', () => {
        it('completes when order and seats found and creates tickets', async () => {
            const order = {
                id: 'ord-1',
                userId: 'u1',
                eventId: 'e1',
                stripePaymentIntentId: 'pi_1',
            };
            const seats = [
                { id: 's1', ticketTierId: 'tier-1' },
                { id: 's2', ticketTierId: null },
            ];
            dbMocks.queryOrdersFindFirst.mockResolvedValueOnce(order);
            dbMocks.querySeatsFindMany.mockResolvedValueOnce(seats);

            const repo = createOrdersRepository();
            await repo.processPaymentSucceeded({
                paymentIntentId: 'pi_1',
                userId: 'u1',
                eventId: 'e1',
                seatIds: ['s1', 's2'],
            });

            expect(dbMocks.updateSetWhere).toHaveBeenCalled();
            expect(dbMocks.queryOrdersFindFirst).toHaveBeenCalled();
            expect(dbMocks.querySeatsFindMany).toHaveBeenCalled();
            expect(dbMocks.insertValues).toHaveBeenCalledTimes(1);
        });

        it('does nothing when order not found', async () => {
            dbMocks.queryOrdersFindFirst.mockResolvedValueOnce(null);

            const repo = createOrdersRepository();
            await repo.processPaymentSucceeded({
                paymentIntentId: 'pi_1',
                userId: 'u1',
                eventId: 'e1',
                seatIds: ['s1'],
            });

            expect(dbMocks.querySeatsFindMany).not.toHaveBeenCalled();
        });
    });

    describe('create', () => {
        it('throws SeatsNotFoundError when seats missing for event', async () => {
            dbMocks.selectFromWhere
                .mockResolvedValueOnce([{ seatId: 's1' }])
                .mockResolvedValueOnce([]);

            const repo = createOrdersRepository();
            await expect(
                repo.create({
                    eventId: 'e1',
                    userId: 'u1',
                    seatIds: ['s1', 's2'],
                    tierId: 't1',
                    email: 'u@example.com',
                })
            ).rejects.toThrow(SeatsNotFoundError);
        });

        it('throws SeatsNotFoundError when any seat already sold', async () => {
            dbMocks.selectFromWhere
                .mockResolvedValueOnce([{ seatId: 's1' }, { seatId: 's2' }])
                .mockResolvedValueOnce([{ seatId: 's1' }]);

            const repo = createOrdersRepository();
            await expect(
                repo.create({
                    eventId: 'e1',
                    userId: 'u1',
                    seatIds: ['s1', 's2'],
                    tierId: 't1',
                    email: 'u@example.com',
                })
            ).rejects.toThrow(SeatsNotFoundError);
        });

        it('returns orderId and clientSecret when Stripe and insert succeed', async () => {
            dbMocks.selectFromWhere.mockReset();
            const selectResults = [[{ seatId: 's1' }, { seatId: 's2' }], []];
            dbMocks.selectFromWhere.mockImplementation(() =>
                Promise.resolve(selectResults.shift() ?? [])
            );
            dbMocks.querySeatsFindMany.mockResolvedValue([
                { id: 's1', ticketTierId: 't1' },
                { id: 's2', ticketTierId: 't1' },
            ]);
            dbMocks.queryTicketTiersFindMany.mockResolvedValue([{ id: 't1', price: '100.00' }]);
            stripeMocks.paymentIntentsCreate.mockResolvedValue({
                id: 'pi_123',
                client_secret: 'secret_123',
            });
            dbMocks.insertValuesReturning.mockResolvedValue([
                {
                    id: 'ord-1',
                    userId: 'u1',
                    eventId: 'e1',
                    totalAmount: '200.00',
                    status: 'pending',
                    stripePaymentIntentId: 'pi_123',
                },
            ]);

            const repo = createOrdersRepository();
            const result = await repo.create({
                eventId: 'e1',
                userId: 'u1',
                seatIds: ['s1', 's2'],
                tierId: 't1',
                email: 'u@example.com',
            });

            expect(result).toEqual({ orderId: 'ord-1', clientSecret: 'secret_123' });
            expect(stripeMocks.paymentIntentsCreate).toHaveBeenCalled();
        });

        it('throws OrderCreationFailedError when order insert returns empty', async () => {
            dbMocks.selectFromWhere
                .mockResolvedValueOnce([{ seatId: 's1' }])
                .mockResolvedValueOnce([]);
            dbMocks.querySeatsFindMany.mockResolvedValue([{ id: 's1', ticketTierId: 't1' }]);
            dbMocks.queryTicketTiersFindMany.mockResolvedValue([{ id: 't1', price: '50.00' }]);
            stripeMocks.paymentIntentsCreate.mockResolvedValue({
                id: 'pi_1',
                client_secret: 'sec',
            });
            dbMocks.insertValuesReturning.mockResolvedValue([]);

            const repo = createOrdersRepository();
            await expect(
                repo.create({
                    eventId: 'e1',
                    userId: 'u1',
                    seatIds: ['s1'],
                    tierId: 't1',
                    email: 'u@example.com',
                })
            ).rejects.toThrow(OrderCreationFailedError);
        });
    });

    describe('handleWebhook', () => {
        it('throws InvalidWebhookSignatureError when constructEvent throws', async () => {
            stripeMocks.webhooksConstructEvent.mockImplementation(() => {
                throw new Error('bad signature');
            });

            const repo = createOrdersRepository();
            await expect(
                repo.handleWebhook({
                    body: '{}',
                    signature: 'sig',
                })
            ).rejects.toThrow(InvalidWebhookSignatureError);
        });

        it('returns received when event type is not payment_intent.succeeded', async () => {
            stripeMocks.webhooksConstructEvent.mockReturnValue({
                type: 'customer.created',
                data: { object: {} },
            });

            const repo = createOrdersRepository();
            const result = await repo.handleWebhook({
                body: '{}',
                signature: 'sig',
            });

            expect(result).toEqual({ received: true });
            expect(dbMocks.updateSetWhere).not.toHaveBeenCalled();
        });

        it('processes payment and returns received when sync (no producer)', async () => {
            stripeMocks.webhooksConstructEvent.mockReturnValue({
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_1',
                        metadata: {
                            userId: 'u1',
                            eventId: 'e1',
                            seatIds: 's1,s2',
                        },
                    },
                },
            });
            const order = { id: 'ord-1', userId: 'u1', eventId: 'e1' };
            dbMocks.queryOrdersFindFirst.mockResolvedValueOnce(order);
            dbMocks.querySeatsFindMany.mockResolvedValueOnce([
                { id: 's1', ticketTierId: 't1' },
                { id: 's2', ticketTierId: 't1' },
            ]);

            const repo = createOrdersRepository();
            const result = await repo.handleWebhook({
                body: '{}',
                signature: 'sig',
            });

            expect(result).toEqual({ received: true });
            expect(dbMocks.updateSetWhere).toHaveBeenCalled();
        });

        it('calls paymentProducer and returns when producer provided', async () => {
            stripeMocks.webhooksConstructEvent.mockReturnValue({
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_1',
                        metadata: { userId: 'u1', eventId: 'e1', seatIds: 's1' },
                    },
                },
            });
            const paymentProducer = vi.fn().mockResolvedValue(undefined);

            const repo = createOrdersRepository({ paymentProducer });
            const result = await repo.handleWebhook({
                body: '{}',
                signature: 'sig',
            });

            expect(result).toEqual({ received: true });
            expect(paymentProducer).toHaveBeenCalledWith({
                paymentIntentId: 'pi_1',
                userId: 'u1',
                eventId: 'e1',
                seatIds: ['s1'],
            });
            expect(dbMocks.updateSetWhere).not.toHaveBeenCalled();
        });
    });
});
