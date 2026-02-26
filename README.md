# ticketing-api

## Docker (full stack: API, Postgres, Redis, Kafka, Traefik, HTTPS)

Runs the API behind Traefik with HTTPS and optional load balancing.

1. **Generate self-signed TLS certs** (required for HTTPS):

    ```bash
    chmod +x scripts/gen-certs.sh && ./scripts/gen-certs.sh
    ```

2. **Start the stack**:

    ```bash
    docker compose up -d --build
    ```

3. **Access**:
    - **HTTPS (recommended):** https://localhost/health (accept the self-signed cert in the browser).
    - **HTTP:** http://localhost → redirects to HTTPS.
    - **Direct API port** (if you add `ports: ["3001:3001"]` to the `api` service): http://localhost:3001.

4. **Load balancing:** Run multiple API replicas:

    ```bash
    docker compose up -d --scale api=2
    ```

    Traefik will round-robin between API instances.

5. **Env:** Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `JWT_SECRET` in `.env` or export them. For Stripe webhooks, point the endpoint to `https://your-domain/orders/webhook` (or use a tunnel for local).

**Stack:** Postgres, Redis (cache + BullMQ, `maxmemory 128mb`, `allkeys-lru`), Kafka (KRaft), Jaeger, API, Traefik (reverse proxy + TLS).

---

## High throughput & resilience

- **Orders / payments:** When `KAFKA_BROKERS` is set (e.g. in Docker), the Stripe webhook returns 200 immediately after enqueueing to Kafka. A consumer processes `payment.succeeded` with retries (default 3, exponential backoff); failed messages go to the **dead-letter topic** `payment.succeeded.dlq`. Without Kafka, the webhook processes synchronously (same as before).
- **Events read path:** If `REDIS_URL` is set, GET /events and GET /events/:id use a **Redis cache** (cache-aside, TTL from `EVENTS_CACHE_TTL_SECONDS`). Creating an event invalidates the list cache. Redis is configured with `allkeys-lru` so high read load is handled with eviction.

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
