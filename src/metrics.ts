/**
 * OpenTelemetry metrics for Service Performance Monitoring (SPM).
 * Exports request duration and count to the same OTLP endpoint as traces (e.g. Jaeger).
 * When OTEL_SDK_DISABLED is set or OTEL_EXPORTER_OTLP_ENDPOINT is missing, metrics are no-op.
 * Jaeger's Monitor tab can show trace-derived SPM; this adds explicit metrics for backends that ingest OTLP metrics.
 */
import type { Meter } from '@opentelemetry/api';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'ticketing-api';
const METER_NAME = SERVICE_NAME;
const METER_VERSION = '1.0.0';

let meter: Meter | null = null;

let requestDuration: ReturnType<Meter['createHistogram']> | undefined;
let requestCount: ReturnType<Meter['createCounter']> | undefined;

/**
 * Record HTTP request metrics for SPM (duration and count).
 * No-op when metrics are disabled.
 */
export function recordRequestMetrics(attrs: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
}): void {
    if (!meter || requestDuration == null || requestCount == null) return;
    try {
        const durationSec = attrs.durationMs / 1000;
        requestDuration.record(durationSec, {
            'http.request.method': attrs.method,
            'http.route': attrs.route || attrs.method,
            'http.response.status_code': attrs.statusCode,
        });
        requestCount.add(1, {
            'http.request.method': attrs.method,
            'http.route': attrs.route || attrs.method,
            'http.response.status_code': attrs.statusCode,
        });
    } catch {
        // avoid breaking request path on metric errors
    }
}

export function initMetrics(): void {
    if (process.env.OTEL_SDK_DISABLED === 'true') {
        return;
    }
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const metricsEnabled = process.env.OTEL_METRICS_EXPORTER !== 'none' && endpoint;
    if (!metricsEnabled) {
        return;
    }
    const url = endpoint!.endsWith('/v1/metrics')
        ? endpoint
        : `${endpoint.replace(/\/$/, '')}/v1/metrics`;
    const resource = resourceFromAttributes({ 'service.name': SERVICE_NAME });
    const exporter = new OTLPMetricExporter({ url });
    const reader = new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: 10_000,
    });
    const provider = new MeterProvider({ resource, readers: [reader] });
    meter = provider.getMeter(METER_NAME, METER_VERSION);
    requestDuration = meter.createHistogram('http.server.request.duration', {
        unit: 's',
        description: 'HTTP request duration in seconds',
    });
    requestCount = meter.createCounter('http.server.request.count', {
        description: 'HTTP request count',
    });
}
