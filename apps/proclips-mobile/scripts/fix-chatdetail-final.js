// scripts/fix-chatdetail-final.js
// 修复 ChatDetailScreen.tsx 的两处残留问题
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'screens', 'ChatDetailScreen.tsx');
let text = fs.readFileSync(file, 'utf8');

// 1) 移除残留的 `};`
text = text.replace(/^};\r?$/m, '');

// 2) 拆分 export default function ChatDetailScreen() {  const route ...
const re = /(export default function ChatDetailScreen\(\)\{)  (const route = useRoute<[^>]+>\(\);)/;
if (re.test(text)) {
  text = text.replace(re, '$1\n  $2');
  console.log('[OK] split function header');
} else {
  console.log('[WARN] pattern not found');
}

// 3) 把 RouteProp<RootStackParamList, 'ChatDetail'> 替换为 ChatDetailRoute
text = text.replace(
  /useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>\(\)/,
  'useRoute<ChatDetailRoute>()',
);
console.log('[OK] use ChatDetailRoute');

fs.writeFileSync(file, text, 'utf8');
console.log('[DONE]');
