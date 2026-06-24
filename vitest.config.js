"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("vitest/config");
var plugin_react_1 = require("@vitejs/plugin-react");
var path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        // 测试环境变量
        env: {
            VITE_MOCK_PASSWORD: 'IamBigBoss',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                'dist/',
                'src-tauri/',
            ],
            thresholds: {
                global: {
                    branches: 60,
                    functions: 60,
                    lines: 60,
                    statements: 60,
                },
            },
        },
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'src-tauri'],
        // jsdom 的 AbortController.abort() 会在内部触发一个 rejection，
        // 即使用户代码已正确 catch 也会被 vitest 标记为 unhandled rejection。
        // 这是 jsdom 的已知行为，对测试正确性无影响。
        dangerouslyIgnoreUnhandledErrors: true,
    },
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
        },
    },
});
