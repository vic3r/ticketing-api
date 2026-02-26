# ticketing-api

Node.js ticketing API (Fastify, Postgres, Redis, Kafka). Run the full stack with Docker Compose and test endpoints with Postman.

---

## Quick start with Docker Compose

Run the entire stack (API, Postgres, Redis, Kafka, Jaeger, Traefik) in one command.

1. **Generate self-signed TLS certs** (required for HTTPS behind Traefik):

    ```bash
    chmod +x scripts/gen-certs.sh && ./scripts/gen-certs.sh
    ```

2. **Start the stack**:

    ```bash
    docker compose up -d --build
    ```

3. **Verify**:
    - Open **https://localhost/health** in a browser (accept the self-signed certificate).
    - You should see a healthy response from the API.

4. **Direct API port:** The API is also exposed on **http://localhost:3001** so you can call it from Postman without going through Traefik or HTTPS.

---

## Testing with Postman

1. **Import the collection and environments**
    - **Collection:** Postman → Import → `api/ticketing-api.postman.json`.
    - **Environments:** Import `api/postman-env-local.json` and `api/postman-env-https.json`, then select **Ticketing API – Local (HTTP)** or **Ticketing API – HTTPS (Traefik)** in the environment dropdown. For HTTPS, add `certs/server.crt` in Settings → Certificates for host `localhost` so SSL verification can stay on.

2. **Set collection or environment variables**
    - **Docker:** `baseUrl` = `http://localhost:3001` (default; API port is exposed).
    - **Docker (HTTPS via Traefik):** Use the **Ticketing API – HTTPS (Traefik)** environment and add the project’s `certs/server.crt` in Postman (see step 7 below) so you can keep SSL verification on.
    - **Local dev (no Docker):** Run `npm run dev` and use `baseUrl` = `http://localhost:3001`.

3. **Get a JWT**
    - Run **Auth → Register** (or **Login** if the user exists).
    - Copy the `token` from the response.
    - In the collection, set variable **token** = that value (or use the collection’s “Set token from response” script if you add one).

4. **Call protected endpoints**
    - Use **Events → Create event (admin)**, **Venues → Create venue (admin)**, **Reservations → Reserve seats**, **Orders → Checkout**, etc. They use `Authorization: Bearer {{token}}` (or `{{adminToken}}` for Admin folder requests).

5. **Admin scenarios**
    - **Auth → Login as admin** (user must exist with `role=admin`, e.g. `admin@example.com`). Then use the **Admin** folder: **Create venue (admin)**, **Create event (admin)**. **Create event as user (expect 403)** uses the regular user token and should return 403.

6. **Run collection tests**
    - Click the collection → **Run**. Select the requests to run and your environment. Postman will execute each request and run the **Tests** scripts (status codes, saving `token`/`eventId`/`venueId`, etc.). Use this to smoke-test the API.

7. **HTTPS with certificate verification (recommended for Traefik):** To use **https://localhost** with SSL verification **on** in Postman, trust the same cert Traefik uses:
    - Generate certs if you haven’t: `./scripts/gen-certs.sh` (creates `certs/server.crt` and `certs/server.key`).
    - In Postman: **Settings** (gear) → **Certificates** → **Add Certificate**.
    - **Host:** `localhost`
    - **CRT file:** select `certs/server.crt` from the project (or the full path to it).
    - **Key file:** leave empty (only needed for client certs).
    - Save, then set collection variable **baseUrl** = `https://localhost`.
    - Keep **Settings → General → SSL certificate verification** **ON**. Postman will now verify the connection using your self-signed cert.

---

## Docker stack details

- **HTTPS:** https://localhost → Traefik → API. HTTP on port 80 redirects to HTTPS.
- **Load balancing:** `docker compose up -d --scale api=2` — Traefik round-robins between API instances.
- **Env:** Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `JWT_SECRET` in `.env` or export them. For Stripe webhooks, use `https://your-domain/orders/webhook` (or a tunnel for local).

**Stack:** Postgres, Redis (cache + BullMQ, `maxmemory 128mb`, `allkeys-lru`), Kafka (KRaft), Jaeger, API, Traefik (reverse proxy + TLS).

---

## Monitoring & SPM (Jaeger)

The stack uses **Jaeger v2** with the **Monitor** tab enabled (Service Performance Monitoring).

- **Traces:** The API sends OpenTelemetry traces to Jaeger at `http://jaeger:4318`. Open **http://localhost:16686** for the Jaeger UI.
- **Monitor tab (SPM):** In the Jaeger UI, open **Monitor** to see RED metrics (Request rate, Error rate, Duration) per service and operation. This is powered by:
    - **SpanMetrics connector** inside Jaeger: derives RED metrics from spans.
    - **Prometheus:** scrapes Jaeger’s metrics endpoint (`:8889`) and is used by Jaeger Query for the Monitor tab.
- **Config files:** Under `monitor/`:
    - `jaeger-config-spm.yaml` – Jaeger v2 pipeline (OTLP → batch → memory + spanmetrics, Prometheus exporter on :8889).
    - `jaeger-ui.json` – UI flags (`monitor.menuEnabled: true`).
    - `prometheus.yml` – Scrape config for `jaeger:8889`.
- **App metrics:** The API also exports OTLP metrics (`http.server.request.duration`, `http.server.request.count`) when `OTEL_METRICS_EXPORTER=otlp`; these can be consumed by an OpenTelemetry Collector or other backends if you add one.

---

## Project structure

```
src/
├── cache/           # Redis cache (events), keys, interface
├── config/          # Logger, security (CORS, rate limit, JWT)
├── db/              # Drizzle DB client and schema
├── dto/             # Request/response DTOs
├── enums/           # Shared enums (order, seat, event status, etc.)
├── errors/          # Domain errors (auth, events, orders, reservations, venues)
├── infra/           # Infrastructure: Redis connection for BullMQ queues
├── interfaces/      # Service and repository interfaces
├── messaging/       # Async messaging
│   ├── kafka/       # Kafka producer, consumer, config (payments)
│   └── queues/      # BullMQ reservation queue and worker
├── plugins/         # Fastify plugins (auth, requireAdmin)
├── repositories/    # Data access (events, orders, reservations, user, venues)
├── routes/          # HTTP routes (auth, events, orders, reservations, venues)
├── services/        # Business logic
├── app.ts           # Fastify app builder
├── metrics.ts       # OpenTelemetry SPM metrics (request duration, count)
├── server.ts        # HTTP server entry
└── tracing.ts       # OpenTelemetry tracing
```

---

## High throughput & resilience

- **Orders / payments:** When `KAFKA_BROKERS` is set (e.g. in Docker), the Stripe webhook returns 200 immediately after enqueueing to Kafka. A consumer processes `payment.succeeded` with retries (default 3, exponential backoff); failed messages go to the **dead-letter topic** `payment.succeeded.dlq`. Without Kafka, the webhook processes synchronously.
- **Events read path:** If `REDIS_URL` is set, GET /events and GET /events/:id use a **Redis cache** (cache-aside, TTL from `EVENTS_CACHE_TTL_SECONDS`). Creating an event invalidates the list cache. Redis uses `allkeys-lru` for eviction under load.

---

## Git hooks (commit & push)

Husky runs checks automatically:

- **On every commit** (pre-commit): `lint-staged` (ESLint --fix + Prettier --write on staged files), then `npm run test`.
- **On every push** (pre-push): `npm run check` (format check + lint + test).

Hooks are installed when you run `npm install` (the `prepare` script runs Husky). If they don’t run (e.g. after a clone or if install didn’t have write access to `.git`), run once:

```bash
npx husky
```

To skip hooks for a single commit or push: `git commit --no-verify` or `git push --no-verify`.
