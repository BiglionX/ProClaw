const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_ROOT = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const removed = [];
for (const jsPath of walk(SCAN_ROOT)) {
  const base = jsPath.slice(0, -3);
  if (fs.existsSync(base + '.ts') || fs.existsSync(base + '.tsx')) {
    fs.unlinkSync(jsPath);
    removed.push(path.relative(ROOT, jsPath));
  }
}

for (const rel of ['App.js', '__mocks__/Toast.js', '__mocks__/react-native.js']) {
  const jsPath = path.join(ROOT, rel);
  const base = jsPath.slice(0, -3);
  if (fs.existsSync(jsPath) && (fs.existsSync(base + '.ts') || fs.existsSync(base + '.tsx'))) {
    fs.unlinkSync(jsPath);
    removed.push(rel);
  }
}

if (removed.length === 0) {
  console.log('[clean-stale-js] Nothing to remove');
} else {
  console.log('[clean-stale-js] Removed ' + removed.length + ' file(s)');
  removed.forEach(function (v) { console.log('  - ' + v); });
}