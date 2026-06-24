"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var path_1 = require("path");
// https://vitejs.dev/config/
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // 将大型依赖分包
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
                    'vendor-charts': ['recharts'],
                    'vendor-utils': ['axios', 'crypto-js', 'zod', 'zustand', 'react-hook-form'],
                },
            },
        },
        chunkSizeWarningLimit: 1000, // 提高警告阈值到1000KB
    },
});
