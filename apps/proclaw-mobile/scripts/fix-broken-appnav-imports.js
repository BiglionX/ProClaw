// scripts/fix-broken-appnav-imports.js
// P1 任务：把被插到文件中部或 export 之后的 import 修复回顶部
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const BROKEN = [
  'src/screens/OnboardingWizard.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/IdentityChatScreen.tsx',
  'src/screens/MessagesTab.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/screens/SupplyChainScreen.tsx',
  'src/screens/ProfileTab.tsx',
  'src/components/FloatingSecretaryButton.tsx',
  'src/screens/ChatDetailScreen.tsx',
  'src/screens/ContactsTab.tsx',
  'src/screens/ContactsScreen.tsx',
  'src/screens/CallScreen.tsx',
  'src/screens/SalesOrderScreen.tsx',
  'src/screens/HomeScreen.tsx',
];

const LINE = "import type { AppNavigation } from '../types/navigation';";

for (const rel of BROKEN) {
  const file = path.resolve(SRC, '..', rel);
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(LINE)) {
    // 该文件可能 import 形式不同（没有这条）
    // 查找其他 import type { AppNavigation } from '...types/navigation';
    const altMatch = text.match(/import type \{ AppNavigation \} from ['"][^'"]*types\/navigation['"];?/);
    if (!altMatch) {
      console.log(`[SKIP] ${rel}: no AppNavigation import found`);
      continue;
    }
    // 删除此 import 行（含前后空行）
    const escapedLine = altMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^\\s*${escapedLine}\\s*\\n`, 'gm');
    text = text.replace(re, '');
    text = reInsertAtTop(text, altMatch[0]);
    fs.writeFileSync(file, text, 'utf8');
    console.log(`[OK] ${rel}: reinserted AppNavigation import to top`);
    continue;
  }
  // 删除这条 line（含前后空行）
  const escapedLine = LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*${escapedLine}\\s*\\n`, 'gm');
  text = text.replace(re, '');
  text = reInsertAtTop(text, LINE);
  fs.writeFileSync(file, text, 'utf8');
  console.log(`[OK] ${rel}: reinserted AppNavigation import to top`);
}

function reInsertAtTop(text, importLine) {
  // 找到第一个 import 之前的位置
  const lines = text.split('\n');
  let firstImportIdx = -1;
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      if (firstImportIdx === -1) firstImportIdx = i;
      lastImportIdx = i;
    }
  }
  if (firstImportIdx === -1) {
    // 没有 import，插到文件开头（跳过前导注释）
    let i = 0;
    while (i < lines.length && /^\s*(\/\/|\/\*|\*|\s*$)/.test(lines[i])) {
      i++;
    }
    lines.splice(i, 0, importLine);
  } else {
    // 插到最后一个 import 之后
    lines.splice(lastImportIdx + 1, 0, importLine);
  }
  return lines.join('\n');
}

console.log('\n=== 完成 ===');
