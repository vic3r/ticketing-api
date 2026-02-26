import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processPaymentMessage } from '../../../src/kafka/consumer.js';
import type {
    IOrdersRepository,
    PaymentSucceededPayload,
} from '../../../src/interfaces/orders.repository.interface.js';

describe('Kafka consumer processPaymentMessage', () => {
    let mockOrdersRepository: IOrdersRepository;
    let sendDlq: (payload: PaymentSucceededPayload, raw: string) => Promise<void>;

    beforeEach(() => {
        mockOrdersRepository = {
            create: vi.fn(),
            handleWebhook: vi.fn(),
            processPaymentSucceeded: vi.fn(),
        };
        sendDlq = vi.fn().mockResolvedValue(undefined);
    });

    it('sends to DLQ when message is invalid JSON', async () => {
        await processPaymentMessage('not json', mockOrdersRepository, sendDlq);

        expect(sendDlq).toHaveBeenCalledWith(
            { paymentIntentId: '', userId: '', eventId: '', seatIds: [] },
            'not json'
        );
        expect(mockOrdersRepository.processPaymentSucceeded).not.toHaveBeenCalled();
    });

    it('calls processPaymentSucceeded and does not send to DLQ on success', async () => {
        const payload: PaymentSucceededPayload = {
            paymentIntentId: 'pi_1',
            userId: 'u1',
            eventId: 'e1',
            seatIds: ['s1'],
        };
        vi.mocked(mockOrdersRepository.processPaymentSucceeded).mockResolvedValue(undefined);

        await processPaymentMessage(JSON.stringify(payload), mockOrdersRepository, sendDlq, {
            maxRetries: 1,
            retryBackoffMs: 1,
        });

        expect(mockOrdersRepository.processPaymentSucceeded).toHaveBeenCalledWith(payload);
        expect(sendDlq).not.toHaveBeenCalled();
    });

    it('sends to DLQ after maxRetries failures', async () => {
        const payload: PaymentSucceededPayload = {
            paymentIntentId: 'pi_1',
            userId: 'u1',
            eventId: 'e1',
            seatIds: ['s1'],
        };
        const raw = JSON.stringify(payload);
        vi.mocked(mockOrdersRepository.processPaymentSucceeded).mockRejectedValue(
            new Error('DB error')
        );

        await processPaymentMessage(raw, mockOrdersRepository, sendDlq, {
            maxRetries: 2,
            retryBackoffMs: 1,
        });

        expect(mockOrdersRepository.processPaymentSucceeded).toHaveBeenCalledTimes(2);
        expect(sendDlq).toHaveBeenCalledWith(payload, raw);
    });

    it('succeeds on second attempt when first fails', async () => {
        const payload: PaymentSucceededPayload = {
            paymentIntentId: 'pi_1',
            userId: 'u1',
            eventId: 'e1',
            seatIds: [],
        };
        vi.mocked(mockOrdersRepository.processPaymentSucceeded)
            .mockRejectedValueOnce(new Error('temp'))
            .mockResolvedValueOnce(undefined);

        await processPaymentMessage(JSON.stringify(payload), mockOrdersRepository, sendDlq, {
            maxRetries: 3,
            retryBackoffMs: 1,
        });

        expect(mockOrdersRepository.processPaymentSucceeded).toHaveBeenCalledTimes(2);
        expect(sendDlq).not.toHaveBeenCalled();
    });
});
