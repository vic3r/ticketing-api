import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    getKafkaBrokers,
    isKafkaEnabled,
    TOPIC_PAYMENT_SUCCEEDED,
    TOPIC_PAYMENT_SUCCEEDED_DLQ,
} from '../../../src/kafka/config.js';

describe('Kafka config', () => {
    const origKafkaBrokers = process.env.KAFKA_BROKERS;
    const origTopic = process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED;
    const origDlq = process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED_DLQ;

    afterEach(() => {
        process.env.KAFKA_BROKERS = origKafkaBrokers;
        process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED = origTopic;
        process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED_DLQ = origDlq;
    });

    describe('getKafkaBrokers', () => {
        it('returns empty array when KAFKA_BROKERS is not set', () => {
            delete process.env.KAFKA_BROKERS;
            expect(getKafkaBrokers()).toEqual([]);
        });

        it('returns single broker', () => {
            process.env.KAFKA_BROKERS = 'localhost:9092';
            expect(getKafkaBrokers()).toEqual(['localhost:9092']);
        });

        it('returns multiple brokers and trims whitespace', () => {
            process.env.KAFKA_BROKERS = 'host1:9092, host2:9092 , host3:9092';
            expect(getKafkaBrokers()).toEqual(['host1:9092', 'host2:9092', 'host3:9092']);
        });

        it('filters empty segments', () => {
            process.env.KAFKA_BROKERS = 'host1:9092,,host2:9092';
            expect(getKafkaBrokers()).toEqual(['host1:9092', 'host2:9092']);
        });
    });

    describe('isKafkaEnabled', () => {
        it('returns false when no brokers', () => {
            delete process.env.KAFKA_BROKERS;
            expect(isKafkaEnabled()).toBe(false);
        });

        it('returns true when brokers set', () => {
            process.env.KAFKA_BROKERS = 'localhost:9092';
            expect(isKafkaEnabled()).toBe(true);
        });
    });

    describe('topic constants', () => {
        it('TOPIC_PAYMENT_SUCCEEDED has default', () => {
            delete process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED;
            expect(TOPIC_PAYMENT_SUCCEEDED).toBeDefined();
            expect(typeof TOPIC_PAYMENT_SUCCEEDED).toBe('string');
        });

        it('TOPIC_PAYMENT_SUCCEEDED_DLQ has default', () => {
            delete process.env.KAFKA_TOPIC_PAYMENT_SUCCEEDED_DLQ;
            expect(TOPIC_PAYMENT_SUCCEEDED_DLQ).toBeDefined();
            expect(typeof TOPIC_PAYMENT_SUCCEEDED_DLQ).toBe('string');
        });
    });
});
