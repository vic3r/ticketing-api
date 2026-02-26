import { Kafka } from 'kafkajs';
import type {
    IOrdersRepository,
    PaymentSucceededPayload,
} from '../interfaces/orders.repository.interface.js';
import { getKafkaBrokers, TOPIC_PAYMENT_SUCCEEDED, TOPIC_PAYMENT_SUCCEEDED_DLQ } from './config.js';
import { sendToDlq } from './producer.js';

const MAX_RETRIES = Number(process.env.KAFKA_PAYMENT_CONSUMER_MAX_RETRIES) || 3;
const RETRY_BACKOFF_MS = Number(process.env.KAFKA_PAYMENT_CONSUMER_RETRY_BACKOFF_MS) || 1000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SendToDlqFn = (payload: PaymentSucceededPayload, rawMessage: string) => Promise<void>;

/** Process one payment.succeeded message (parse, retry, DLQ). Used by consumer and tests. */
export async function processPaymentMessage(
    rawMessage: string,
    ordersRepository: IOrdersRepository,
    sendDlq: SendToDlqFn,
    options?: { maxRetries?: number; retryBackoffMs?: number }
): Promise<void> {
    let payload: PaymentSucceededPayload;
    try {
        payload = JSON.parse(rawMessage) as PaymentSucceededPayload;
    } catch {
        await sendDlq({ paymentIntentId: '', userId: '', eventId: '', seatIds: [] }, rawMessage);
        return;
    }

    const maxRetries = options?.maxRetries ?? MAX_RETRIES;
    const retryBackoffMs = options?.retryBackoffMs ?? RETRY_BACKOFF_MS;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await ordersRepository.processPaymentSucceeded(payload);
            lastError = null;
            break;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
                await sleep(retryBackoffMs * Math.pow(2, attempt - 1));
            }
        }
    }

    if (lastError) {
        await sendDlq(payload, rawMessage);
        console.error(
            `[Kafka] payment.succeeded failed after ${maxRetries} attempts, sent to DLQ`,
            { paymentIntentId: payload.paymentIntentId, error: lastError }
        );
    }
}

export async function startPaymentSucceededConsumer(
    ordersRepository: IOrdersRepository
): Promise<void> {
    const brokers = getKafkaBrokers();
    if (brokers.length === 0) return;

    const kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID ?? 'ticketing-api-consumer',
        brokers,
    });
    const consumer = kafka.consumer({
        groupId: process.env.KAFKA_CONSUMER_GROUP ?? 'ticketing-payment',
    });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC_PAYMENT_SUCCEEDED, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            const raw = message.value?.toString();
            if (!raw) return;
            await processPaymentMessage(raw, ordersRepository, sendToDlq);
        },
    });
}
