#!/usr/bin/env node
/**
 * scripts/lint-no-console.js
 * P1-7 兜底扫描：检测 src/ 目录中是否有 console.* 调用残留
 * 无需 ESLint 依赖即可执行（Node 原生 fs/path/regex）
 *
 * 用法：
 *   node scripts/lint-no-console.js            # 仅报告
 *   node scripts/lint-no-console.js --strict   # 有违规即 exit 1
 *
 * 例外：
 *   - scripts/ 目录（脚本自身）
 *   - __tests__ / __mocks__
 *   - src/utils/logger.ts（logger 内部封装 console）
 *   - Console 大写开头的非 console.* 调用（如自定义类）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [path.join(ROOT, 'src'), path.join(ROOT, 'App.tsx')];
const EXCLUDE_DIRS = new Set(['__tests__', '__mocks__', 'node_modules', 'scripts']);
const EXCLUDE_FILES = new Set([
  path.join(ROOT, 'src', 'utils', 'logger.ts'),
]);
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);

// 匹配 console.log/info/debug/warn/error
const CONSOLE_RE = /(^|[^.\w$])console\.(log|info|debug|warn|error)\s*\(/g;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    out.push(dir);
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXT.has(ext)) out.push(full);
    }
  }
  return out;
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 跳过注释行
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    // 跳过 logger.ts 内的实现（再次防御）
    if (file === path.join(ROOT, 'src', 'utils', 'logger.ts')) continue;
    CONSOLE_RE.lastIndex = 0;
    let m;
    while ((m = CONSOLE_RE.exec(line)) !== null) {
      violations.push({
        file: path.relative(ROOT, file),
        line: i + 1,
        col: m.index + 1,
        match: m[0].trim(),
        text: line.trim(),
      });
    }
  }
  return violations;
}

function main() {
  const files = [];
  for (const target of SCAN_DIRS) {
    walk(target, files);
  }
  files.push(...EXCLUDE_FILES); // ensure logger.ts is in list (so it gets filtered)
  const unique = Array.from(new Set(files));

  let total = 0;
  const report = [];
  for (const f of unique) {
    const v = scanFile(f);
    if (v.length > 0) {
      total += v.length;
      report.push({ file: path.relative(ROOT, f), violations: v });
    }
  }

  if (total === 0) {
    console.log('[lint:no-console] OK - 0 console.* 残留 in src/ + App.tsx');
    console.log(`[lint:no-console] 扫描文件: ${unique.length} 个`);
    process.exit(0);
  }

  console.error(`[lint:no-console] FAIL - 发现 ${total} 处 console.* 残留:\n`);
  for (const r of report) {
    console.error(`  ${r.file}`);
    for (const v of r.violations) {
      console.error(`    L${v.line}:${v.col}  ${v.match}`);
      console.error(`      ${v.text}`);
    }
    console.error('');
  }
  console.error('请使用 src/utils/logger.ts 替代 console.*');
  process.exit(1);
}

main();
