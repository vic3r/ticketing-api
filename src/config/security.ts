/**
 * Security configuration aligned with OWASP recommendations.
 * - Rate limiting: A04 Insecure Design, A07 Auth Failures (brute force)
 * - Headers (Helmet): A05 Security Misconfiguration
 * - CORS: A05, A01 Broken Access Control
 * - Input/body limits: DoS mitigation
 * - Error handling: no internal details in responses (A05)
 */

const env = process.env;
const isProd = env.NODE_ENV === 'production';

/** Allowed CORS origins. In prod use allowlist; in dev allow frontend or true. */
export function getCorsOrigin(): string | boolean | string[] {
    const url = env.FRONTEND_URL;
    if (!url) return true;
    if (url.includes(','))
        return url
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean);
    return url;
}

/** Global rate limit: max requests per window (per IP). */
export const rateLimit = {
    max: parseInt(env.RATE_LIMIT_MAX ?? '200', 10) || 200,
    timeWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS ?? '900000', 10) || 900000, // 15 min
};

/** Stricter limit for auth routes (login/register) to mitigate brute force. */
export const authRateLimit = {
    max: parseInt(env.AUTH_RATE_LIMIT_MAX ?? '10', 10) || 10,
    timeWindowMs: parseInt(env.AUTH_RATE_LIMIT_WINDOW_MS ?? '900000', 10) || 900000, // 15 min
};

/** Max request body size (bytes). Helps prevent DoS via large payloads. */
export const bodyLimit = parseInt(env.BODY_LIMIT ?? '1048576', 10) || 1048576; // 1 MiB

/** Helmet options: secure headers (X-Content-Type-Options, X-Frame-Options, etc.). */
export const helmetOptions = {
    contentSecurityPolicy: false, // API returns JSON; CSP is for HTML
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' as const },
    noSniff: true,
    xssFilter: true,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
};

/** Generic error message shown to clients in production (avoid leaking internals). */
export const genericErrorMessage = 'An unexpected error occurred';

/** Use in route handlers: in production, 500 responses get generic message. */
export function getPublic500Message(detail: string): string {
    return process.env.NODE_ENV === 'production' ? genericErrorMessage : detail;
}
