/**
 * OpenTelemetry tracing bootstrap. Import this once at app startup (after dotenv).
 * - When OTEL_SDK_DISABLED is set (e.g. in tests), tracing is no-op.
 * - When OTEL_EXPORTER_OTLP_ENDPOINT is set, traces are exported via OTLP/HTTP (Kibana/Elastic APM, Jaeger, etc.).
 * - Otherwise, spans are still created; set OTEL_TRACES_EXPORTER=console for local dev.
 */
import { trace } from '@opentelemetry/api';
import type { Span, SpanAttributes, Tracer } from '@opentelemetry/api';
import {
    NodeTracerProvider,
    BatchSpanProcessor,
    SimpleSpanProcessor,
    ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'ticketing-api';
const TRACER_NAME = SERVICE_NAME;
const TRACER_VERSION = '1.0.0';

let tracer: Tracer;

function noopTracer(): Tracer {
    return trace.getTracer(TRACER_NAME, TRACER_VERSION);
}

export function getTracer(): Tracer {
    return tracer ?? noopTracer();
}

/**
 * Run an async function under a new span. Records duration and optional attributes.
 * Use for benchmarking specific operations (e.g. auth.register, orders.checkout).
 */
export async function runWithSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: SpanAttributes
): Promise<T> {
    const t = getTracer();
    const opts = attributes ? { attributes } : undefined;
    return t.startActiveSpan(name, opts ?? {}, async (span) => {
        try {
            const result = await fn(span);
            span.setStatus({ code: 1 }); // OK
            return result as T;
        } catch (err) {
            span.recordException(err as Error);
            span.setStatus({ code: 2, message: (err as Error)?.message }); // ERROR
            throw err;
        } finally {
            span.end();
        }
    });
}

export function initTracing(): void {
    if (process.env.OTEL_SDK_DISABLED === 'true') {
        tracer = noopTracer();
        return;
    }

    const resource = resourceFromAttributes({ 'service.name': SERVICE_NAME });
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const exporterKind = process.env.OTEL_TRACES_EXPORTER ?? (otlpEndpoint ? 'otlp' : 'none');

    const spanProcessors: import('@opentelemetry/sdk-trace-base').SpanProcessor[] = [];
    if (exporterKind === 'otlp' && otlpEndpoint) {
        const url = otlpEndpoint.endsWith('/v1/traces')
            ? otlpEndpoint
            : `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`;
        spanProcessors.push(new BatchSpanProcessor(new OTLPTraceExporter({ url })));
    } else if (exporterKind === 'console') {
        spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    const provider = new NodeTracerProvider({ resource, spanProcessors });
    provider.register();
    registerInstrumentations({
        instrumentations: [new HttpInstrumentation()],
    });

    tracer = trace.getTracer(TRACER_NAME, TRACER_VERSION);
}
