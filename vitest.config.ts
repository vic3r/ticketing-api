import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        testTimeout: 10000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.d.ts',
                'src/db/schema.ts',
                '**/*.test.ts',
                'src/server.ts',
                'src/**/*.interface.ts',
                'src/dto/**',
                'src/models/**',
            ],
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
});
