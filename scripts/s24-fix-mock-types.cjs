// Sprint 2.4 修复: jest.fn() as jest.Mock → jest.fn() as jest.Mock<any, any[]>
const fs = require('fs');

const files = [
  'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\controllers\\__tests__\\oidc-is_admin.test.ts',
  'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\middleware\\__tests__\\auth.middleware.test.ts',
];

for (const p of files) {
  let c = fs.readFileSync(p, 'utf8');
  if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
  c = c.replace(/\r\n/g, '\n');
  const before = c;
  // 匹配: const mockXxx = jest.fn(...) as jest.Mock;
  // 改成: const mockXxx = jest.fn(...) as jest.Mock<any, any[]>;
  c = c.replace(/(jest\.fn\([^)]*\))\s+as\s+jest\.Mock;/g, '$1 as jest.Mock<any, any[]>;');
  // 同样处理: const mockXxx = jest.fn() as jest.Mock;
  c = c.replace(/(jest\.fn\(\))\s+as\s+jest\.Mock;/g, '$1 as jest.Mock<any, any[]>;');
  if (c !== before) {
    fs.writeFileSync(p, c, 'utf8');
    console.log('OK: ' + p);
  } else {
    console.log('NO CHANGE: ' + p);
  }
}
