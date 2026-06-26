import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // 移除 Tauri 生产构建中可能引起问题的 crossorigin 属性
    // 修复 v6：原 regex 只匹配 crossorigin="value" 形式，不匹配 boolean 形式 crossorigin 后跟其他属性
    // 实际 vite 产物是 <script type="module" crossorigin src="..."> 需要跳过 crossorigin 及后续空白
    {
      name: 'remove-crossorigin',
      transformIndexHtml: {
        order: 'post',
        handler(html: string) {
          return html.replace(/\s+crossorigin(\s+|\s*=[\s"'][^"']*["'])/g, ' ');
        },
      },
    },
  ],
  base: './',
  server: {
    port: 3000,
    watch: {
      // 忽略 Rust 构建产物与发布产物，避免 Vite 在 Windows 上因文件锁 (EBUSY) 崩溃
      ignored: [
        '**/src-tauri/target/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/coverage/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/playwright-browsers/**',
        // 打包后 RELEASES/v*/ 下的 .exe / .msi 同样会被文件锁，不应纳入 watch
        '**/RELEASES/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-dialog/dist-js/index.js'),
      '@tauri-apps/plugin-fs': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-fs/dist-js/index.js'),
      '@tauri-apps/plugin-shell': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-shell/dist-js/index.js'),
      '@anthropic-ai/sdk/lib/transform-json-schema': path.resolve(__dirname, 'src/lib/polyfills/transform-json-schema.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['recharts'],
          'vendor-ai': ['langchain', '@langchain/core', '@langchain/openai', '@langchain/anthropic', '@langchain/ollama'],
        },
      },
    },
  },
});
