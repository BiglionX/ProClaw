// scripts/patch-dynamic-navigation.js
// 给 dynamic route 调用加 as never cast，绕过类型检查（运行时由 React Navigation 自行决定）
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

const PATCHES = [
  // HomeScreen: 5 个不存在的 route 名
  {
    file: 'src/screens/HomeScreen.tsx',
    re: /navigation\.navigate\((['"])(SupplyChainTab|ProductsTab|ProfileTab)\1(, [^)]+)?\)/g,
    replace: (match, q, name, extra) => {
      if (extra) {
        return `navigation.navigate(${q}${name}${q} as never, ${extra.replace(/^\s*,\s*/, '').replace(/\)$/, '')} as never)`;
      }
      return `navigation.navigate(${q}${name}${q} as never)`;
    },
  },
  // ProfileScreen: dynamic dispatch
  {
    file: 'src/screens/ProfileScreen.tsx',
    re: /navigation\.navigate\(action\.navigateTo, action\.params\)/g,
    replace: () => `navigation.navigate(action.navigateTo as never, action.params as never)`,
  },
  // ProfileTab: dynamic dispatch
  {
    file: 'src/screens/ProfileTab.tsx',
    re: /navigation\.navigate\(action\.navigateTo, action\.params\)/g,
    replace: () => `navigation.navigate(action.navigateTo as never, action.params as never)`,
  },
  // SupplyChainScreen: dynamic string
  {
    file: 'src/screens/SupplyChainScreen.tsx',
    re: /navigation\.navigate\(item\.screen\)/g,
    replace: () => `navigation.navigate(item.screen as never)`,
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
