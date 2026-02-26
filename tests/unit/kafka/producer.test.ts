import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createPaymentProducer,
    disconnectPaymentProducer,
} from '../../../src/messaging/kafka/producer.js';
import type { PaymentSucceededPayload } from '../../../src/interfaces/orders.repository.interface.js';

const kafkaMocks = vi.hoisted(() => ({
    mockSend: vi.fn().mockResolvedValue(undefined),
    mockConnect: vi.fn().mockResolvedValue(undefined),
    mockDisconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('kafkajs', () => ({
    Kafka: function Kafka() {
        return {
            producer: function producer() {
                return {
                    connect: kafkaMocks.mockConnect,
                    send: kafkaMocks.mockSend,
                    disconnect: kafkaMocks.mockDisconnect,
                };
            },
        };
    },
}));

describe('Kafka producer', () => {
    const origKafkaBrokers = process.env.KAFKA_BROKERS;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.KAFKA_BROKERS = 'localhost:9092';
    });

    afterEach(async () => {
        process.env.KAFKA_BROKERS = origKafkaBrokers;
        await disconnectPaymentProducer();
    });

    it('returns null when KAFKA_BROKERS is not set', async () => {
        delete process.env.KAFKA_BROKERS;
        const send = await createPaymentProducer();
        expect(send).toBeNull();
    });

    it('returns send function and calls producer.send with payload', async () => {
        const send = await createPaymentProducer();
        expect(send).toBeTypeOf('function');
        expect(kafkaMocks.mockConnect).toHaveBeenCalled();

        const payload: PaymentSucceededPayload = {
            paymentIntentId: 'pi_1',
            userId: 'u1',
            eventId: 'e1',
            seatIds: ['s1', 's2'],
        };
        await send!(payload);

        expect(kafkaMocks.mockSend).toHaveBeenCalledTimes(1);
        expect(kafkaMocks.mockSend).toHaveBeenCalledWith({
            topic: 'payment.succeeded',
            messages: [
                {
                    key: 'pi_1',
                    value: JSON.stringify(payload),
                },
            ],
        });
    });
});
