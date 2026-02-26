export const TOPIC_PAYMENT_SUCCEEDED =
    process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED ?? 'payment.succeeded';
export const TOPIC_PAYMENT_SUCCEEDED_DLQ =
    process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED_DLQ ?? 'payment.succeeded.dlq';

export function getKafkaBrokers(): string[] {
    const brokers = process.env.KAFKA_BROKERS;
    if (!brokers) return [];
    return brokers
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);
}

export function isKafkaEnabled(): boolean {
    return getKafkaBrokers().length > 0;
}
