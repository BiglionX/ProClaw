// Sprint 2.4 D2 修复 v2: Case 11 mock 返回同一个 Response 导致 body 被消费
const fs = require('fs');
const p = 'd:\\BigLionX\\NvwaX\\packages\\nvwax-web\\lib\\api\\admin.test.ts';
let c = fs.readFileSync(p, 'utf8');
if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
c = c.replace(/\r\n/g, '\n');

// 修复 Case 11: mockResolvedValue → mockImplementation 每次返回新 Response
const old_ = `  it('never calls localStorage.getItem(admin_token) for authed methods', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem');
    mockAuthedFetch.mockResolvedValue(ok({ data: null }));
    await adminApi.getProfile();
    await adminApi.getUserList(1, 20, 'q');
    await adminApi.banUser('u-1');
    // 至少不应读 admin_token
    const adminTokenReads = spy.mock.calls.filter((c) => c[0] === 'admin_token');
    expect(adminTokenReads).toHaveLength(0);
    spy.mockRestore();
  });`;
const new_ = `  it('never calls localStorage.getItem(admin_token) for authed methods', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem');
    // 每次返回新 Response（避免 body 被消费）
    mockAuthedFetch.mockImplementation(async () => ok({ data: null }));
    await adminApi.getProfile();
    await adminApi.getUserList(1, 20, 'q');
    await adminApi.banUser('u-1');
    // 至少不应读 admin_token
    const adminTokenReads = spy.mock.calls.filter((c) => c[0] === 'admin_token');
    expect(adminTokenReads).toHaveLength(0);
    spy.mockRestore();
  });`;

if (c.includes(old_)) {
  c = c.replace(old_, new_);
  fs.writeFileSync(p, c, 'utf8');
  console.log('OK: Case 11 fixed');
} else {
  console.log('MISS: old block not found');
}
