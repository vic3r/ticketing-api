# API Security (OWASP-aligned)

This document summarizes the security measures applied to the ticketing API.

## Rate limiting & throttling

- **Global rate limit** (per IP): configurable via `RATE_LIMIT_MAX` (default 200) and `RATE_LIMIT_WINDOW_MS` (default 15 min). Returns `429 Too Many Requests` when exceeded.
- **Auth routes** (`/auth/register`, `/auth/login`): stricter limit via `AUTH_RATE_LIMIT_MAX` (default 10) per `AUTH_RATE_LIMIT_WINDOW_MS` (default 15 min) to mitigate brute force and credential stuffing (OWASP A07).

## Security headers (Helmet)

- **X-Content-Type-Options: nosniff** – prevents MIME sniffing.
- **X-XSS-Protection** – legacy XSS filter.
- **Referrer-Policy: strict-origin-when-cross-origin** – limits referrer leakage.
- **HSTS** – enabled in production only (1 year, includeSubDomains).
- **Cross-Origin-Resource-Policy: cross-origin** – controls cross-origin access.
- CSP is disabled (API returns JSON; CSP is for HTML apps).

## CORS

- **Origin**: allowlist from `FRONTEND_URL` (comma-separated for multiple). In development, can fall back to `true` if unset.
- **Credentials**: supported for cookie/auth if needed.

## Input & request limits

- **Body size**: `BODY_LIMIT` (default 1 MiB) to reduce DoS via large payloads.
- **Auth payloads**: `email`, `password`, and `name` have `maxLength` in JSON schema (email 255, password 512, name 200) for validation and abuse prevention.

## Error handling

- **Production**: 500 responses return a generic message (`An unexpected error occurred`) so stack traces and internal details are not exposed (OWASP A05 Security Misconfiguration).
- **Development**: full error message is returned for debugging.

## OWASP Top 10 mapping

| OWASP (2021)                                   | Mitigation in this API                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| A01 Broken Access Control                      | JWT on protected routes; CORS allowlist; auth rate limit.                 |
| A02 Cryptographic Failures                     | Passwords hashed with bcrypt; use HTTPS in production; secure JWT secret. |
| A03 Injection                                  | Drizzle ORM (parameterized queries); JSON schema validation on inputs.    |
| A04 Insecure Design                            | Rate limiting; auth throttling; body and input limits.                    |
| A05 Security Misconfiguration                  | Helmet headers; generic 500 messages in prod; restrictive CORS.           |
| A07 Identification and Authentication Failures | Stricter rate limit on login/register; strong password hashing; JWT.      |

## Environment variables (security-related)

See `.env.example`. Key options:

- `FRONTEND_URL` – allowed CORS origin(s).
- `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` – global rate limit.
- `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS` – auth route limit.
- `BODY_LIMIT` – max request body size in bytes.
- `JWT_SECRET` – must be strong and kept secret in production.
- `NODE_ENV=production` – enables HSTS, generic error messages, and optional logging.

## Recommendations

- Run the API behind HTTPS (e.g. reverse proxy) in production.
- Keep dependencies updated (`npm audit`, Dependabot).
- Use a strong `JWT_SECRET` and rotate it if compromised.
- For distributed rate limiting across instances, consider a Redis-backed store with `@fastify/rate-limit` (see plugin docs).
