import { Kafka, type Producer } from 'kafkajs';
import type { PaymentSucceededPayload } from '../../interfaces/orders.repository.interface.js';
import { getKafkaBrokers, TOPIC_PAYMENT_SUCCEEDED, TOPIC_PAYMENT_SUCCEEDED_DLQ } from './config.js';

let producer: Producer | null = null;

export async function createPaymentProducer(): Promise<
    ((payload: PaymentSucceededPayload) => Promise<void>) | null
> {
    const brokers = getKafkaBrokers();
    if (brokers.length === 0) return null;

    const kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID ?? 'ticketing-api',
        brokers,
    });
    producer = kafka.producer();
    await producer.connect();

    return async (payload: PaymentSucceededPayload): Promise<void> => {
        if (!producer) return;
        await producer.send({
            topic: TOPIC_PAYMENT_SUCCEEDED,
            messages: [
                {
                    key: payload.paymentIntentId,
                    value: JSON.stringify(payload),
                },
            ],
        });
    };
}

export async function sendToDlq(
    payload: PaymentSucceededPayload,
    rawMessage: string
): Promise<void> {
    if (!producer) return;
    await producer.send({
        topic: TOPIC_PAYMENT_SUCCEEDED_DLQ,
        messages: [
            {
                key: payload.paymentIntentId,
                value: rawMessage,
                headers: { 'original-payload': JSON.stringify(payload) },
            },
        ],
    });
}

export async function disconnectPaymentProducer(): Promise<void> {
    if (producer) {
        await producer.disconnect();
        producer = null;
    }
}
