// scripts/fix-chatdetail-types.js
// 修复 ChatDetailScreen.tsx 中的 import + 类型问题（CRLF 兼容）
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'screens', 'ChatDetailScreen.tsx');
let text = fs.readFileSync(file, 'utf8');

// 1) 删除整个 ChatParams 块
const chatParamsBlock = /type ChatParams = \{[\s\S]*?\};[\r\n]+/;
if (chatParamsBlock.test(text)) {
  text = text.replace(chatParamsBlock, '');
  console.log('[OK] removed ChatParams block');
} else {
  console.log('[WARN] ChatParams block not found');
}

// 2) 替换 import 语句：增加 RootStackParamList
text = text.replace(
  /import type \{ AppNavigation \} from '\.\.\/types\/navigation';/,
  "import type { AppNavigation, RootStackParamList } from '../types/navigation';",
);
console.log('[OK] updated import');

// 3) 把 `export default function ChatDetailScreen() {  const route = useRoute<...>();`
//    拆成两行
text = text.replace(
  /(export default function ChatDetailScreen\(\) \{)  (const route = useRoute<RouteProp<ChatParams, 'ChatDetail'>>\(\);)/,
  "$1\n  $2",
);
console.log('[OK] split function header');

// 4) 把 RouteProp<ChatParams, 'ChatDetail'> 替换为 RouteProp<RootStackParamList, 'ChatDetail'>
text = text.replace(
  /RouteProp<ChatParams, 'ChatDetail'>/,
  "RouteProp<RootStackParamList, 'ChatDetail'>",
);
console.log('[OK] replaced RouteProp type');

// 5) 在 export default 之前插入 type alias（如果还没有）
if (!/type ChatDetailRoute\s*=/.test(text)) {
  text = text.replace(
    /(export default function ChatDetailScreen\(\) \{)/,
    "type ChatDetailRoute = RouteProp<RootStackParamList, 'ChatDetail'>;\n\n$1",
  );
  console.log('[OK] inserted ChatDetailRoute type alias');
}

fs.writeFileSync(file, text, 'utf8');
console.log('[DONE]');
