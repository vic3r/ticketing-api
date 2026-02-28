/// <reference types="node" />
import { afterEach, describe, expect, it } from 'vitest';
import {
    getCorsOrigin,
    getPublic500Message,
    genericErrorMessage,
} from '../../../src/config/security.js';

describe('Security config', () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origFrontendUrl = process.env.FRONTEND_URL;

    afterEach(() => {
        process.env.NODE_ENV = origNodeEnv;
        process.env.FRONTEND_URL = origFrontendUrl;
    });

    describe('getCorsOrigin', () => {
        it('returns true when FRONTEND_URL is not set', () => {
            delete process.env.FRONTEND_URL;
            expect(getCorsOrigin()).toBe(true);
        });

        it('returns single URL when FRONTEND_URL is one origin (production)', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://app.example.com';
            expect(getCorsOrigin()).toBe('https://app.example.com');
        });

        it('returns array when FRONTEND_URL contains comma (production)', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://a.com,https://b.com';
            expect(getCorsOrigin()).toEqual(['https://a.com', 'https://b.com']);
        });

        it('trims and filters empty when multiple URLs (production)', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = ' https://a.com , https://b.com , ';
            expect(getCorsOrigin()).toEqual(['https://a.com', 'https://b.com']);
        });

        it('includes localhost:3002 and 3000 in development when FRONTEND_URL is set', () => {
            process.env.NODE_ENV = 'development';
            process.env.FRONTEND_URL = 'https://app.example.com';
            const result = getCorsOrigin();
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('https://app.example.com');
            expect(result).toContain('http://localhost:3002');
            expect(result).toContain('http://localhost:3000');
        });
    });

    describe('getPublic500Message', () => {
        it('returns generic message in production', () => {
            process.env.NODE_ENV = 'production';
            expect(getPublic500Message('Internal DB error')).toBe(genericErrorMessage);
        });

        it('returns detail in non-production', () => {
            process.env.NODE_ENV = 'development';
            expect(getPublic500Message('Internal DB error')).toBe('Internal DB error');
        });
    });
});
