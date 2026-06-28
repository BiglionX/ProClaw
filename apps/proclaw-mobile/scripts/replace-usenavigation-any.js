// scripts/replace-usenavigation-any.js
// P1 任务：批量把 useNavigation<any>() 替换为 useNavigation<AppNavigation>()
// 自动添加 RootStackParamList / AppNavigation 导入
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const SKIP_DIRS = new Set(['__tests__', '__mocks__', 'node_modules', 'types']);
let totalReplaced = 0;
let filesModified = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      process(full, dir);
    }
  }
}

function relativeImport(fileDir, targetRel) {
  const target = path.resolve(SRC, targetRel);
  let rel = path.relative(fileDir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function process(file, fileDir) {
  const text = fs.readFileSync(file, 'utf8');

  // 1) 替换 useNavigation<any>() / useNavigation() → useNavigation<AppNavigation>()
  let replaced = text
    .replace(/useNavigation<any>\(\)/g, 'useNavigation<AppNavigation>()')
    .replace(/useNavigation\(\)/g, 'useNavigation<AppNavigation>()');

  if (replaced === text) return; // 无变化

  // 2) 检查是否需要添加 import
  const hasAppNav = /import\s+\{[^}]*\bAppNavigation\b[^}]*\}\s+from\s+['"][^'"]*types\/navigation['"]/.test(replaced) ||
                    /import\s+\{[^}]*\bAppNavigation\b[^}]*\}\s+from\s+['"][^'"]*navigation['"]/.test(replaced);

  if (!hasAppNav) {
    const importPath = relativeImport(fileDir, 'types/navigation');
    const importLine = `import type { AppNavigation } from '${importPath}';`;

    const lines = replaced.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(import|export)\s/.test(lines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    replaced = lines.join('\n');
  }

  fs.writeFileSync(file, replaced, 'utf8');
  const beforeCount = (text.match(/useNavigation<any>\(\)/g) || []).length
    + (text.match(/(?<!<)useNavigation\(\)/g) || []).length;
  totalReplaced += beforeCount;
  filesModified += 1;
  console.log(`[OK] ${path.relative(path.resolve(__dirname, '..'), file)} (${beforeCount} 处)`);
}

walk(SRC);
console.log(`\n=== 汇总 ===`);
console.log(`修改文件: ${filesModified}`);
console.log(`替换 useNavigation<any>() / useNavigation(): ${totalReplaced}`);
