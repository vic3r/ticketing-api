# Tracing (OpenTelemetry)

The API uses **OpenTelemetry** for distributed tracing and execution-time benchmarks. Each request gets an HTTP span (from `@opentelemetry/instrumentation-http`), and key operations create child spans for per-function timing.

## Spans

| Span name | Route / operation | Attributes (examples) |
|-----------|-------------------|------------------------|
| `auth.register` | POST /auth/register | auth.email |
| `auth.login` | POST /auth/login | auth.email |
| `events.findAll` | GET /events | - |
| `events.findById` | GET /events/:id | event.id |
| `events.create` | POST /events | event.name |
| `reservations.lockSeats` | POST /reservations | reservation.userId, reservation.seatCount |
| `orders.checkout` | POST /orders/checkout | order.userId, order.eventId, order.seatCount |
| `orders.webhook` | POST /orders/webhook | - |

HTTP server spans are created automatically (method, URL, status code). Custom spans above are created via `runWithSpan()` in the routes and measure the duration of the underlying service call.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OTEL_SERVICE_NAME` | Service name in traces | `ticketing-api` |
| `OTEL_SDK_DISABLED` | Set to `true` to disable tracing (e.g. tests) | - |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP/HTTP endpoint for trace export | - |
| `OTEL_TRACES_EXPORTER` | `otlp`, `console`, or omit for no export | Inferred: `otlp` if endpoint set, else none |

## Exporting traces

### Docker Compose (Jaeger) — recommended for local viewing

The project’s `docker-compose.yml` includes **Jaeger** and wires the API to send traces to it.

1. Start the stack (postgres, redis, Jaeger, API):
   ```bash
   docker compose up -d
   ```
2. Open the **Jaeger UI**: [http://localhost:16686](http://localhost:16686)
3. In the UI, choose **Service** `ticketing-api`, then **Find Traces**. You’ll see one trace per request; open a trace to see the HTTP span and child spans (e.g. `auth.register`, `orders.checkout`) with durations.

The API container is already configured with:

- `OTEL_SERVICE_NAME=ticketing-api`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318`
- `OTEL_TRACES_EXPORTER=otlp`

To run the API locally but still send traces to Jaeger started by Compose, set in your `.env`:

- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
- `OTEL_TRACES_EXPORTER=otlp`

### Kibana / Elastic APM

1. Run Elastic Stack with APM (or Elastic Cloud with APM).
2. Use the OTLP HTTP endpoint for the APM server, e.g. `http://localhost:8200` (or the URL provided by Elastic).
3. Set in `.env`:
   - `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:8200` (or your APM ingest URL)
   - `OTEL_TRACES_EXPORTER=otlp`

Elastic APM accepts OTLP; ensure the APM server is configured for OTLP ingestion.

### Jaeger (standalone)

1. Run Jaeger with OTLP receiver (e.g. all-in-one with `COLLECTOR_OTLP_ENABLED=true`).
2. Set:
   - `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
   - `OTEL_TRACES_EXPORTER=otlp`

### Local dev (console)

To print spans to the console:

- `OTEL_TRACES_EXPORTER=console`

No endpoint needed; spans are logged in the terminal.

## Benchmarks

- **Per-request**: Each HTTP request is a top-level span; total request time is the span duration.
- **Per-operation**: Use the custom span names above in your backend (Kibana, Jaeger, etc.) to filter and compare:
  - e.g. p50/p95/p99 for `auth.register`, `orders.checkout`, `reservations.lockSeats`, etc.
- **Integration**: The whole request trace shows HTTP span → child spans (e.g. `auth.register`), so you see both full request time and time inside each operation.

## Tests

Tracing is disabled in tests via `OTEL_SDK_DISABLED=true` in `tests/setup.ts`, so no exporter or HTTP instrumentation is active and tests stay fast and deterministic.
