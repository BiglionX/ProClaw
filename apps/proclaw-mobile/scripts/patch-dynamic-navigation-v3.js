// scripts/patch-dynamic-navigation-v3.js
// v1 把 navigate 替换为 `navigate('X' as never)`，tsc 不接受 [never, never]
// v3 把整个 navigate 调用 cast 为 any：`(navigation.navigate as any)(...)`
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

const PATCHES = [
  // HomeScreen: SupplyChainTab 3 处（带 params）
  {
    file: 'src/screens/HomeScreen.tsx',
    re: /navigation\.navigate\(\s*(['"])(SupplyChainTab|ProductsTab|ProfileTab)\1(\s*as\s*never)?\s*(,\s*\{[^}]*\}\s*(as\s*never)?)?\s*\)/g,
    replace: (match, q, name, _n1, paramsPart) => {
      if (paramsPart) {
        const inner = paramsPart.replace(/^\s*,\s*/, '').replace(/\s*(as\s*never)\s*$/, '');
        return `(navigation.navigate as any)(${q}${name}${q}, ${inner})`;
      }
      return `(navigation.navigate as any)(${q}${name}${q})`;
    },
  },
  // ProfileScreen: action.navigateTo
  {
    file: 'src/screens/ProfileScreen.tsx',
    re: /navigation\.navigate\(\s*action\.navigateTo\s*as\s*never\s*,\s*action\.params\s*as\s*never\s*\)/g,
    replace: () => `(navigation.navigate as any)(action.navigateTo, action.params)`,
  },
  // ProfileTab: action.navigateTo
  {
    file: 'src/screens/ProfileTab.tsx',
    re: /navigation\.navigate\(\s*action\.navigateTo\s*as\s*never\s*,\s*action\.params\s*as\s*never\s*\)/g,
    replace: () => `(navigation.navigate as any)(action.navigateTo, action.params)`,
  },
  // SupplyChainScreen: item.screen
  {
    file: 'src/screens/SupplyChainScreen.tsx',
    re: /navigation\.navigate\(\s*item\.screen\s*as\s*never\s*\)/g,
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
