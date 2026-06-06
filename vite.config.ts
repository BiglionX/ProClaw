import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // 移除 Tauri 生产构建中可能引起问题的 crossorigin 属性
    {
      name: 'remove-crossorigin',
      transformIndexHtml: {
        order: 'post',
        handler(html: string) {
          return html.replace(/\bcrossorigin\s*=\s*["'][^"']*["']\s*/g, '');
        },
      },
    },
  ],
  base: './',
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-dialog/dist-js/index.js'),
      '@tauri-apps/plugin-fs': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-fs/dist-js/index.js'),
      '@tauri-apps/plugin-shell': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-shell/dist-js/index.js'),
    },
  },
  build: {
    rollupOptions: {
      external: ['@anthropic-ai/sdk/lib/transform-json-schema'],
    },
  },
});
