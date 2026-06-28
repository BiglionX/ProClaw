// scripts/patch-dynamic-navigation-v2.js
// 用 (navigation.navigate as any)(...) 绕过类型检查（运行时由 React Navigation 自行决定）
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

const PATCHES = [
  {
    file: 'src/screens/HomeScreen.tsx',
    re: /navigation\.navigate\((['"])(SupplyChainTab|ProductsTab|ProfileTab)\1(, [^)]+)?\)/g,
    replace: (match, q, name, extra) => {
      if (extra) {
        const paramsStr = extra.replace(/^\s*,\s*/, '').replace(/\)$/, '');
        return `(navigation.navigate as any)(${q}${name}${q}, ${paramsStr})`;
      }
      return `(navigation.navigate as any)(${q}${name}${q})`;
    },
  },
  {
    file: 'src/screens/ProfileScreen.tsx',
    re: /navigation\.navigate\(action\.navigateTo, action\.params\)/g,
    replace: () => `(navigation.navigate as any)(action.navigateTo, action.params)`,
  },
  {
    file: 'src/screens/ProfileTab.tsx',
    re: /navigation\.navigate\(action\.navigateTo, action\.params\)/g,
    replace: () => `(navigation.navigate as any)(action.navigateTo, action.params)`,
  },
  {
    file: 'src/screens/SupplyChainScreen.tsx',
    re: /navigation\.navigate\(item\.screen\)/g,
    replace: () => `(navigation.navigate as any)(item.screen)`,
  },
];

for (const patch of PATCHES) {
  const file = path.resolve(SRC, '..', patch.file);
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replace(patch.re, patch.replace);
  if (text === before) {
    console.log(`[WARN] no change in ${patch.file}`);
    continue;
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log(`[OK] patched ${patch.file}`);
}
console.log('\n=== 完成 ===');
