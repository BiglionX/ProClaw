const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\services\\oidc\\oidc-token.service.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// 1. Add is_admin to IdTokenClaims interface
const old1 = "  permissions?: string[];\n  nonce?: string;\n  auth_time: number;       // unix seconds\n}";
const new1 = "  permissions?: string[];\n  nonce?: string;\n  auth_time: number;       // unix seconds\n  is_admin?: boolean;      // Sprint 2.4: OIDC IdP 注入, RS256 签名, 客户端可信任\n}";

// 2. Add is_admin to signIdToken SignJWT payload
const old2 = `    const jwt = await new SignJWT({
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      permissions: claims.permissions,
      nonce: claims.nonce,
      auth_time: claims.auth_time,
    })`;
const new2 = `    const jwt = await new SignJWT({
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      permissions: claims.permissions,
      nonce: claims.nonce,
      auth_time: claims.auth_time,
      is_admin: claims.is_admin,
    })`;

if (c.includes(old1) && c.includes(old2)) {
  c = c.replace(old1, new1);
  c = c.replace(old2, new2);
  fs.writeFileSync(p, c, 'utf8');
  console.log('OK: is_admin added to IdTokenClaims + signIdToken');
} else {
  console.log('MISS: old1=' + c.includes(old1) + ' old2=' + c.includes(old2));
}
