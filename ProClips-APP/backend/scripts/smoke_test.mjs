#!/usr/bin/env node
/**
 * ProClips Backend 烟雾测试
 * 用法：先 npm run dev 启动服务，再另开终端执行 npm run smoke
 * 也可指定环境变量 PROCLIPS_API_BASE=http://127.0.0.1:4000
 */
const base = process.env.PROCLIPS_API_BASE ?? 'http://127.0.0.1:4000';

function log(label, ok, detail) {
  const tag = ok ? '\u2705' : '\u274C';
  console.log(`${tag} ${label}${detail ? ` :: ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
}

async function jget(path, headers = {}) {
  const r = await fetch(base + path, { headers });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

async function jpost(path, body, headers = {}) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
  });
  const data = await r.json().catch(() => null);
  return { status: r.status, body: data };
}

async function main() {
  console.log(`[smoke] target = ${base}`);

  // 1. /health
  const health = await jget('/health');
  log('GET /health', health.status === 200, `status=${health.status}`);

  // 2. /dev/token (非生产)
  const tk = await jget('/dev/token');
  const token = tk.body?.data?.token;
  log('GET /dev/token', tk.status === 200 && !!token, `token=${token ? token.slice(0, 24) + '...' : 'null'}`);
  if (!token) return;

  const auth = { authorization: `Bearer ${token}` };

  // 3. 模板列表（需鉴权）
  const tpl = await jget('/api/proclips/templates', auth);
  const templates = tpl.body?.data?.templates ?? [];
  log('GET /api/proclips/templates', tpl.status === 200 && templates.length > 0, `count=${templates.length}`);

  // 4. 鉴权失败
  const noauth = await jget('/api/proclips/templates');
  log('GET /api/proclips/templates (无 token 应当 401)', noauth.status === 401, `status=${noauth.status}`);

  // 5. 选模板
  const tplId = templates[0]?.id;
  if (tplId) {
    const sel = await jpost('/api/proclips/select-template', { templateId: tplId }, auth);
    log(`POST /api/proclips/select-template (${tplId})`, sel.status === 200, `status=${sel.status}`);
  } else {
    log('POST /api/proclips/select-template', false, 'no template id');
  }

  // 6. 生成脚本
  const script = await jpost(
    '/api/proclips/generate-script',
    {
      templateId: tplId,
      product: {
        name: '烟雾测试商品',
        features: ['新鲜食材', '当日现做'],
        promo: '开业酬宾 8 折',
      },
    },
    auth
  );
  log('POST /api/proclips/generate-script', script.status === 200, `status=${script.status}`);

  // 7. 商家统计
  const stats = await jget('/api/proclips/merchant-stats', auth);
  log('GET /api/proclips/merchant-stats', stats.status === 200, `status=${stats.status}`);

  console.log('[smoke] done');
}

main().catch((err) => {
  console.error('[smoke] fatal:', err);
  process.exit(1);
});
