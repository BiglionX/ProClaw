const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\controllers\\oidc.controller.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

let changed = 0;

// 1. Add adminService import after databaseService import
const old1 = "import { databaseService } from '../services/database.service.js';";
const new1 = "import { databaseService } from '../services/database.service.js';\nimport { adminService } from '../services/admin.service.js';";
if (c.includes(old1)) { c = c.replace(old1, new1); changed++; console.log('OK 1: import added'); }
else console.log('MISS 1');

// 2. Add is_admin to claims_supported (after 'picture',)
const old2 = "        'name',\n        'picture',\n      ],";
const new2 = "        'name',\n        'picture',\n        'is_admin', // Sprint 2.4: 扩展 claim, 标识 OIDC user 是否为管理员\n      ],";
if (c.includes(old2)) { c = c.replace(old2, new2); changed++; console.log('OK 2: claims_supported'); }
else console.log('MISS 2');

// 3. handleAuthorizationCodeGrant - inject is_admin
const old3 = `    const idToken = await oidcTokenService.signIdToken({
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name ?? undefined,
      nonce: consumed.nonce ?? undefined,
      auth_time: now,
    });`;
const new3 = `    const isAdmin = await adminService.isAdminByEmail(user.email);
    const idToken = await oidcTokenService.signIdToken({
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name ?? undefined,
      nonce: consumed.nonce ?? undefined,
      auth_time: now,
      is_admin: isAdmin,
    });`;
if (c.includes(old3)) { c = c.replace(old3, new3); changed++; console.log('OK 3: handleAuthorizationCodeGrant'); }
else console.log('MISS 3');

// 4. handleRefreshTokenGrant - inject is_admin
const old4 = `    const idToken = await oidcTokenService.signIdToken({
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name ?? undefined,
      auth_time: now,
    });`;
const new4 = `    const isAdmin = await adminService.isAdminByEmail(user.email);
    const idToken = await oidcTokenService.signIdToken({
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name ?? undefined,
      auth_time: now,
      is_admin: isAdmin,
    });`;
if (c.includes(old4)) { c = c.replace(old4, new4); changed++; console.log('OK 4: handleRefreshTokenGrant'); }
else console.log('MISS 4');

// 5. userinfo endpoint - add is_admin
const old5 = `      if (scope.includes('profile')) {
        if (user.name) responseJson.name = user.name;
        if (user.avatar) responseJson.picture = user.avatar;
      }

      res.set('Cache-Control', 'no-store');`;
const new5 = `      if (scope.includes('profile')) {
        if (user.name) responseJson.name = user.name;
        if (user.avatar) responseJson.picture = user.avatar;
      }

      // Sprint 2.4: is_admin 扩展 claim（OIDC Core 允许 IdP 扩展）
      const isAdmin = await adminService.isAdminByEmail(user.email);
      responseJson.is_admin = isAdmin;

      res.set('Cache-Control', 'no-store');`;
if (c.includes(old5)) { c = c.replace(old5, new5); changed++; console.log('OK 5: userinfo is_admin'); }
else console.log('MISS 5');

if (changed === 5) {
  fs.writeFileSync(p, c, 'utf8');
  console.log('SUCCESS: 5 changes applied');
} else {
  console.log('PARTIAL: only ' + changed + '/5 changes');
}
