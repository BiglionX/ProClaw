// Sprint 2.4 修复 v2: jest.Mock<any, any[]> → jest.Mock<any>
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
  c = c.replace(/jest\.Mock<any, any\[\]>/g, 'jest.Mock<any>');
  if (c !== before) {
    fs.writeFileSync(p, c, 'utf8');
    console.log('OK: ' + p);
  }
}
