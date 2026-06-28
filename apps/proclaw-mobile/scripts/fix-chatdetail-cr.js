// scripts/fix-chatdetail-cr.js
// 修复 ChatDetailScreen.tsx 中 export default 行的 CR 错位
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'screens', 'ChatDetailScreen.tsx');
let text = fs.readFileSync(file, 'utf8');

// 把 "() {\r  const route" 拆成两行 (替换 \r 为 \n)
const re = /\(\) \{\r  const route/;
if (re.test(text)) {
  text = text.replace(re, '() {\n  const route');
  console.log('[OK] replaced CR with LF');
} else {
  console.log('[WARN] CR pattern not found');
}

fs.writeFileSync(file, text, 'utf8');
console.log('[DONE]');
