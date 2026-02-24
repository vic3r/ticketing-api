import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrdersService } from '../../../src/services/orders.service.js';
import type { IOrdersRepository } from '../../../src/interfaces/orders.repository.interface.js';

describe('OrdersService', () => {
    let mockOrdersRepository: IOrdersRepository;

    beforeEach(() => {
        mockOrdersRepository = {
            create: vi.fn(),
            handleWebhook: vi.fn(),
        };
    });

    describe('checkOut', () => {
        it('returns orderId and clientSecret (happy path)', async () => {
            vi.mocked(mockOrdersRepository.create).mockResolvedValue({
                orderId: 'ord-1',
                clientSecret: 'pi_secret_xxx',
            });
            const service = createOrdersService(mockOrdersRepository);
            const result = await service.checkOut({
                userId: 'u1',
                eventId: 'e1',
                seatIds: ['s1'],
                tierId: 't1',
                email: 'u@example.com',
            });
            expect(result.orderId).toBe('ord-1');
            expect(result.clientSecret).toBe('pi_secret_xxx');
            expect(mockOrdersRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'u1', eventId: 'e1', seatIds: ['s1'], email: 'u@example.com' })
            );
        });

        it('propagates repository errors', async () => {
            vi.mocked(mockOrdersRepository.create).mockRejectedValue(new Error('Seats not found'));
            const service = createOrdersService(mockOrdersRepository);
            await expect(
                service.checkOut({
                    userId: 'u1',
                    eventId: 'e1',
                    seatIds: ['s1'],
                    tierId: 't1',
                    email: 'u@example.com',
                })
            ).rejects.toThrow('Seats not found');
        });
    });

    describe('handleWebhook', () => {
        it('returns received: true (happy path)', async () => {
            vi.mocked(mockOrdersRepository.handleWebhook).mockResolvedValue({ received: true });
            const service = createOrdersService(mockOrdersRepository);
            const result = await service.handleWebhook({
                body: '{}',
                signature: 'sig',
            });
            expect(result).toEqual({ received: true });
            expect(mockOrdersRepository.handleWebhook).toHaveBeenCalledWith({ body: '{}', signature: 'sig' });
        });

        it('propagates invalid signature error', async () => {
            const { InvalidWebhookSignatureError } = await import('../../../src/errors/orders.errors.js');
            vi.mocked(mockOrdersRepository.handleWebhook).mockRejectedValue(new InvalidWebhookSignatureError());
            const service = createOrdersService(mockOrdersRepository);
            await expect(
                service.handleWebhook({ body: '{}', signature: 'bad' })
            ).rejects.toThrow(InvalidWebhookSignatureError);
        });
    });
});
