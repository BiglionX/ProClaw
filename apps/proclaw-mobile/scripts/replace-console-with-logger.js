// scripts/replace-console-with-logger.js
// P1 任务：批量把 src 下的 console.* 替换为 logger.*，并自动添加 import
// 跳过 __tests__ / __mocks__ 目录
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const SKIP_DIRS = new Set(['__tests__', '__mocks__', 'node_modules']);
const SKIP_FILES = new Set(['logger.ts']);

let totalReplaced = 0;
let filesModified = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name) && !SKIP_FILES.has(name)) {
      process(full, dir);
    }
  }
}

function relativeLoggerImport(fileDir) {
  // 目标：'../utils/logger' 或 '../../utils/logger' 等
  const target = path.resolve(SRC, 'utils', 'logger');
  let rel = path.relative(fileDir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function process(file, fileDir) {
  const text = fs.readFileSync(file, 'utf8');
  const before = text;

  // 1) 替换 console.log/info/debug/warn/error → logger.*
  //    注意：避免误伤 console.table / console.time / console.assert 等
  let replaced = text.replace(
    /\bconsole\.(log|info|debug|warn|error)\(/g,
    'logger.$1(',
  );
  if (replaced === text) return; // 无 console.* 调用，跳过

  // 2) 统计本文件 logger.* 数量，决定是否添加 import
  const loggerCount = (replaced.match(/\blogger\.(log|info|debug|warn|error)\(/g) || []).length;
  if (loggerCount === 0) return;

  // 3) 已经有 logger 导入？
  if (/from\s+['"][^'"]*utils\/logger['"]/.test(replaced) || /import\s*\{[^}]*\blogger\b[^}]*\}\s*from/.test(replaced)) {
    // 已存在 import，不重复添加
  } else {
    // 在最后一个 import 后插入
    const importPath = relativeLoggerImport(fileDir);
    const lines = replaced.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }
    const importLine = `import { logger } from '${importPath}';`;
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    replaced = lines.join('\n');
  }

  fs.writeFileSync(file, replaced, 'utf8');
  const beforeCount = (before.match(/\bconsole\.(log|info|debug|warn|error)\(/g) || []).length;
  totalReplaced += beforeCount;
  filesModified += 1;
  console.log(`[OK] ${path.relative(path.resolve(__dirname, '..'), file)} (${beforeCount} 处)`);
}

walk(SRC);
console.log(`\n=== 汇总 ===`);
console.log(`修改文件: ${filesModified}`);
console.log(`替换 console.* 调用: ${totalReplaced}`);
