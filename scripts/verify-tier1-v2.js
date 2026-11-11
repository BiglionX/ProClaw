// === 层级 1 验证脚本 v2（带 try/catch + 唯一邮箱） ===
// 粘贴到 DevTools Console，按 Enter

const inv = (window).__TAURI__?.core?.invoke
  || (window).__TAURI_INTERNALS__?.invoke
  || (window).__TAURI_INVOKE__;
if (!inv) { console.error('❌ __TAURI_INTERNALS__.invoke 未找到'); }

const ts = Date.now();
const BOSS_EMAIL = `boss-${ts}@test.local`;
const USER_EMAIL = `user-${ts}@test.local`;
const DUP_EMAIL = `dup-${ts}@test.local`;

console.log('🧪 层级 1 验证 v2（带时间戳 + try/catch）');
console.log(`  BOSS_EMAIL=${BOSS_EMAIL}`);
console.log(`  USER_EMAIL=${USER_EMAIL}`);
console.log(`  DUP_EMAIL=${DUP_EMAIL}`);

const safe = async (label, fn) => {
  try {
    const r = await fn();
    console.log(`  ✅ ${label} →`, JSON.stringify(r));
    return r;
  } catch (e) {
    console.log(`  ❌ ${label} →`, e?.message || e);
    return null;
  }
};

const r1 = await safe('V1 register boss', () =>
  inv('register_local_cmd', { email: BOSS_EMAIL, password: 'BossPass123', displayName: 'Boss 1' })
);
const r2 = await safe('V2 register user', () =>
  inv('register_local_cmd', { email: USER_EMAIL, password: 'UserPass123', displayName: 'User 1' })
);
await safe('V3 duplicate boss email (B4)', () =>
  inv('register_local_cmd', { email: BOSS_EMAIL, password: 'OtherPass' })
);
const list = await safe('V4 list_local_users (B2)', () =>
  inv('list_local_users_cmd')
);
if (list) {
  console.log(`  V4 列表数=${list.data?.length}（期望≥2，含本轮新创建的）`);
}
const sw = await safe('V5 switch_local_account (B3)', () =>
  r2 ? inv('switch_local_account_cmd', { accountId: r2.id }) : Promise.reject('r2 为空')
);
await safe('V6 并发注册重复邮箱 (B4 UNIQUE)', async () => {
  const r = await Promise.allSettled([
    inv('register_local_cmd', { email: DUP_EMAIL, password: 'Dup12345' }),
    inv('register_local_cmd', { email: DUP_EMAIL, password: 'Dup54321' }),
  ]);
  const ok = r.filter(x => x.status === 'fulfilled').length;
  console.log(`  V6 成功=${ok}（期望 1）`);
  if (ok !== 1) throw new Error(`UNIQUE 索引未生效: ${ok}/2 成功`);
});
await safe('V7 keyring_get boss (B1)', () =>
  r1 ? inv('keyring_get', { accountId: r1.id }) : Promise.reject('r1 为空')
).then(p => {
  if (p && p !== 'BossPass123') console.log(`  ⚠️ V7 密码不匹配: ${p}`);
});
await safe('V8 keyring_get 不存在 (B6)', () =>
  inv('keyring_get', { accountId: 'non-existent-id' })
).then(p => {
  if (p !== null) console.log(`  ⚠️ V8 期望 null 实际: ${p}`);
});

console.log('🏁 验证结束（所有 ✅ 表示通过）');