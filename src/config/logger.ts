/**
 * Logger configuration for Fastify (Pino).
 * Set LOG_LEVEL=debug|info|warn|error to control verbosity (default: info).
 */

const level = process.env.LOG_LEVEL ?? 'info';

export const loggerOptions = {
    level,
};
