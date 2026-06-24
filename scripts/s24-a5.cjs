const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\services\\oidc\\__tests__\\oidc-token.service.test.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

const old_ = "      expect(payload.sub).toBe('user_spki_test');\n    });\n  });\n});\n";
const new_ = `      expect(payload.sub).toBe('user_spki_test');
    });
  });

  // ──────────── Case 5: signIdToken 注入 is_admin (Sprint 2.4) ────────────
  describe('Case 5: signIdToken injects is_admin claim', () => {
    it('is_admin=true appears in JWT payload after signIdToken', async () => {
      const claims: IdTokenClaims = {
        sub: 'user_admin_1',
        aud: 'nvwax-dev-client',
        email: 'admin@x.com',
        name: 'Admin',
        auth_time: Math.floor(Date.now() / 1000),
        is_admin: true,
      };
      const token = await oidcTokenService.signIdToken(claims);

      // 解析 payload（不验签，验证字段）
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      expect(payload.is_admin).toBe(true);
      expect(payload.sub).toBe('user_admin_1');
    });

    it('is_admin=false appears in JWT payload after signIdToken', async () => {
      const claims: IdTokenClaims = {
        sub: 'user_normal_1',
        aud: 'nvwax-dev-client',
        email: 'user@x.com',
        auth_time: Math.floor(Date.now() / 1000),
        is_admin: false,
      };
      const token = await oidcTokenService.signIdToken(claims);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      expect(payload.is_admin).toBe(false);
    });

    it('signIdToken without is_admin → payload has no is_admin field (undefined dropped)', async () => {
      const claims: IdTokenClaims = {
        sub: 'user_no_admin',
        aud: 'nvwax-dev-client',
        email: 'u@x.com',
        auth_time: Math.floor(Date.now() / 1000),
      };
      const token = await oidcTokenService.signIdToken(claims);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      // undefined 字段被 jose 忽略
      expect('is_admin' in payload).toBe(false);
    });
  });
});
`;

if (c.includes(old_)) {
  c = c.replace(old_, new_);
  fs.writeFileSync(p, c, 'utf8');
  console.log('OK: is_admin cases added to oidc-token.service.test.ts');
} else {
  console.log('MISS');
}
