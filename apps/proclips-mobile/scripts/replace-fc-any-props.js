// scripts/replace-fc-any-props.js
// P1 任务：把 React.FC<{ navigation: any; ... }> 替换为 React.FC<AppScreenProps<'X'>> 或带类型的内联
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

const PATCHES = [
  {
    file: 'src/screens/ConnectionScreen.tsx',
    routeName: 'Connection',
    oldType: 'React.FC<{ navigation: any }>',
  },
  {
    file: 'src/screens/PluginDetailScreen.tsx',
    routeName: 'PluginDetail',
    oldType: 'React.FC<{ route: any; navigation: any }>',
  },
  {
    file: 'src/screens/PluginScreen.tsx',
    routeName: 'PluginPage',
    oldType: 'React.FC<{ route: any; navigation: any }>',
  },
  {
    file: 'src/screens/PluginStoreScreen.tsx',
    routeName: 'PluginStore',
    oldType: 'React.FC<{ navigation: any }>',
  },
];

for (const patch of PATCHES) {
  const file = path.resolve(SRC, '..', patch.file);
  let text = fs.readFileSync(file, 'utf8');
  const newType = `React.FC<AppScreenProps<'${patch.routeName}'>>`;
  const before = text;
  text = text.replace(new RegExp(patch.oldType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newType);
  if (text === before) {
    console.log(`[WARN] no change in ${patch.file}`);
    continue;
  }
  // 注入 import { AppScreenProps } from '../types/navigation';
  if (!/import\s+\{[^}]*\bAppScreenProps\b[^}]*\}\s+from\s+['"][^'"]*types\/navigation['"]/.test(text)) {
    const importPath = path.relative(path.dirname(file), path.resolve(SRC, 'types', 'navigation')).replace(/\\/g, '/');
    const importLine = `import type { AppScreenProps } from '${importPath}';`;
    const lines = text.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    text = lines.join('\n');
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log(`[OK] patched ${patch.file} → ${newType}`);
}

// InvitationHandlerScreen 特殊处理（interface 定义而非内联 type）
const invFile = path.resolve(SRC, '..', 'src/screens/InvitationHandlerScreen.tsx');
let invText = fs.readFileSync(invFile, 'utf8');
const invBefore = invText;
invText = invText.replace(
  /interface InvitationHandlerScreenProps \{[\s\S]*?navigation:\s*any;[\s\S]*?route:\s*any;[\s\S]*?\}/,
  `interface InvitationHandlerScreenProps extends AppScreenProps<'InvitePartner'> {}`,
);
if (invText !== invBefore) {
  if (!/import\s+\{[^}]*\bAppScreenProps\b[^}]*\}\s+from\s+['"][^'"]*types\/navigation['"]/.test(invText)) {
    const importPath = path.relative(path.dirname(invFile), path.resolve(SRC, 'types', 'navigation')).replace(/\\/g, '/');
    const importLine = `import type { AppScreenProps } from '${importPath}';`;
    const lines = invText.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    invText = lines.join('\n');
  }
  fs.writeFileSync(invFile, invText, 'utf8');
  console.log(`[OK] patched InvitationHandlerScreen.tsx → extends AppScreenProps<'InvitePartner'>`);
} else {
  console.log(`[WARN] no change in InvitationHandlerScreen.tsx`);
}

console.log('\n=== 完成 ===');
