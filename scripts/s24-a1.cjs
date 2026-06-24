const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-server\\src\\services\\admin.service.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// Insert isAdminByEmail after getAdminByUsername
const old_ = "  // 管理员登录\n  async login(username: string, password: string): Promise<LoginResult | null> {";
const new_ = `  /**
   * 检查 email 是否在 admins 表中存在（OIDC userinfo 注入 is_admin 用）
   * Sprint 2.4：OIDC IdP 在 signIdToken + userinfo 端点用此方法判断是否注入 is_admin=true
   */
  async isAdminByEmail(email: string): Promise<boolean> {
    if (!email) return false;
    const result = await this.pool.query(
      'SELECT 1 FROM admins WHERE email = $1 LIMIT 1',
      [email],
    );
    return (result.rowCount || 0) > 0;
  }

  // 管理员登录
  async login(username: string, password: string): Promise<LoginResult | null> {`;

if (c.includes(old_)) {
  c = c.replace(old_, new_);
  fs.writeFileSync(p, c, 'utf8');
  console.log('OK: isAdminByEmail added');
} else {
  console.log('MISS');
}
