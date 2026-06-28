const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_ROOT = path.join(ROOT, 'src');
const STRICT = process.argv.includes('--strict');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const violations = [];
for (const jsPath of walk(SCAN_ROOT)) {
  const base = jsPath.slice(0, -3);
  if (fs.existsSync(base + '.ts') || fs.existsSync(base + '.tsx')) {
    violations.push(path.relative(ROOT, jsPath));
  }
}

if (fs.existsSync(path.join(ROOT, 'App.js')) && fs.existsSync(path.join(ROOT, 'App.tsx'))) {
  violations.push('App.js');
}

for (const name of ['Toast', 'react-native']) {
  const js = path.join(ROOT, '__mocks__', name + '.js');
  const ts = path.join(ROOT, '__mocks__', name + '.ts');
  if (fs.existsSync(js) && fs.existsSync(ts)) violations.push(path.relative(ROOT, js));
}

if (violations.length === 0) {
  console.log('[lint-no-stale-js] OK - no stale .js duplicates found');
  process.exit(0);
}

console.error('[lint-no-stale-js] Found ' + violations.length + ' stale .js file(s):');
violations.forEach(function (v) { console.error('  - ' + v); });
process.exit(STRICT ? 1 : 0);