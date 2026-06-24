// Sprint 2.4: 给 vitest.config.ts 加 esbuild jsx: 'automatic' 让测试无需手动 import React
const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-web\\vitest.config.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

const old_ = `export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {`;
const new_ = `export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  // Sprint 2.4: 让被测组件无需显式 import React（生产用 Next.js 自动 JSX 运行时）
  esbuild: {
    jsx: 'automatic',
  },
  test: {`;

if (c.includes(old_)) {
  c = c.replace(old_, new_);
  fs.writeFileSync(p, c, 'utf8');
  console.log('OK: vitest.config.ts updated');
} else {
  console.log('MISS: old block not found');
  console.log(c.slice(0, 600));
}
