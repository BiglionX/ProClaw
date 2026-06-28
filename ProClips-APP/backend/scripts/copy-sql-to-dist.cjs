#!/usr/bin/env node
/**
 * postbuild 脚本：把 src/db/*.sql 拷贝到 dist/db/
 *
 * 背景：tsc 编译只处理 .ts → .js，不会复制非代码资源。
 * Dockerfile 在镜像构建时手写过 `cp src/db/*.sql dist/db/`，
 * 但本地 `npm run build` 不会执行这步，导致 `node dist/index.js` 找不到 schema.sql。
 *
 * 本脚本同时被 package.json 的 postbuild 钩子与 Dockerfile 复用，
 * 保证开发态与生产构建行为一致。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'db');
const DST_DIR = path.join(ROOT, 'dist', 'db');

if (!fs.existsSync(SRC_DIR)) {
  console.error(`[postbuild] src dir not found: ${SRC_DIR}`);
  process.exit(1);
}

fs.mkdirSync(DST_DIR, { recursive: true });

const sqlFiles = fs.readdirSync(SRC_DIR).filter((n) => n.endsWith('.sql'));
if (sqlFiles.length === 0) {
  console.warn('[postbuild] no .sql files found in src/db, skipping');
  process.exit(0);
}

for (const f of sqlFiles) {
  const from = path.join(SRC_DIR, f);
  const to = path.join(DST_DIR, f);
  fs.copyFileSync(from, to);
  console.log(`[postbuild] copied ${f}`);
}