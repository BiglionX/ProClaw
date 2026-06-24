// Sprint 2.4 B2: types/express.d.ts → AdminAuthInfo 扩 email + username 改 optional
const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\types\\express.d.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// 用稳定 ASCII 锚点匹配 AdminAuthInfo 整个 interface 块
const old_ = `export interface AdminAuthInfo {
  id: string;
  username: string;
  role: string;
}`;
const new_ = `// Sprint 2.4 扩展：AdminAuthInfo 加 email 字段；username 改 optional（OIDC 流程用 email 当 username）
export interface AdminAuthInfo {
  id: string;
  email?: string;
  username?: string;
  role: string;
}`;

if (c.includes(old_)) {
  c = c.replace(old_, new_);
  fs.writeFileSync(p, c, 'utf8');
  console.log('OK: express.d.ts AdminAuthInfo extended');
} else {
  console.log('MISS: old block not found, dump first 800 bytes:');
  console.log(JSON.stringify(c.slice(0, 800)));
}
