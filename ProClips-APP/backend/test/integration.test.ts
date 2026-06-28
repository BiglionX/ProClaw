/**
 * 集成测试 - 覆盖核心 API 链路
 * 用 vitest 风格但用 Node fetch 直接打
 * 注：环境变量通过 vitest.setupFiles 设置（在 test 文件加载前生效）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { initDb, closeDb, getDb } from '../src/db/connection.js';
import { startMixWorker, stopMixWorker } from '../src/services/mixWorker.js';
import { devToken } from '../src/utils/jwt.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

let app: FastifyInstance;
let baseUrl: string;
let token: string;

beforeAll(async () => {
  initDb();
  // 幂等：清空上一轮残留的业务数据（避免 UNIQUE / 外键冲突）
  const db = getDb();
  db.exec(`
    DELETE FROM video_final_products;
    DELETE FROM video_mix_tasks;
    DELETE FROM video_raw_clips;
  `);
  app = await buildApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  if (typeof addr === 'object' && addr) {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  } else {
    throw new Error('failed to get server address');
  }
  token = devToken('test-merchant-001');
  startMixWorker();
});

afterAll(async () => {
  stopMixWorker();
  await app.close();
  closeDb();
  // 清理测试数据库
  for (const p of ['./data/test.db.sqlite', './data/test.db.sqlite-shm', './data/test.db.sqlite-wal']) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe('Health', () => {
  it('GET /health', async () => {
    const r = await fetch(`${baseUrl}/health`);
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(j.ok).toBe(true);
    expect(j.data.service).toBe('proclips-backend');
  });
});

describe('Auth', () => {
  it('401 without token', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/templates`);
    expect(r.status).toBe(401);
    const j = await r.json();
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('MISSING_TOKEN');
  });

  it('401 with invalid token', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/templates`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(r.status).toBe(401);
    const j = await r.json();
    expect(j.error.code).toBe('INVALID_TOKEN');
  });
});

describe('Templates', () => {
  it('GET /api/proclips/templates', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(j.ok).toBe(true);
    expect(j.data.templates.length).toBeGreaterThanOrEqual(6);
    expect(j.data.templates[0].id).toBe('tpl_1');
  });

  it('filter by industry', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/templates?industry=餐饮`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    expect(j.data.templates.every((t: { industry: string }) => t.industry === '餐饮')).toBe(true);
  });

  it('POST select-template', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/select-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ templateId: 'tpl_1' }),
    });
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.data.templateId).toBe('tpl_1');
  });
});

describe('Script generation', () => {
  it('POST /api/proclips/generate-script', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        templateId: 'tpl_1',
        product: { name: '招牌麻辣锅底', features: ['32 味香料', '现熬 4 小时'], promo: '本周末 5 折' },
      }),
    });
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.data.candidates.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Full creation pipeline', () => {
  it('upload → submit → status polling → completed', async () => {
    // 1) 上传场景分镜
    const formData = new FormData();
    formData.append('templateId', 'tpl_1');
    formData.append('sceneIndex', '0');
    // 构造一个最小的 mp4 头
    const fakeMp4 = new Blob([new Uint8Array([0, 0, 0, 32, 102, 116, 121, 112])], { type: 'video/mp4' });
    formData.append('file', fakeMp4, 'scene0.mp4');

    const upR = await fetch(`${baseUrl}/api/proclips/upload-scene`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const upJ = await upR.json();
    expect(upJ.ok).toBe(true);
    const fileKey = upJ.data.fileKey;

    // 2) 提交混剪任务
    const submitR = await fetch(`${baseUrl}/api/proclips/mix/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        templateId: 'tpl_1',
        product: { name: '招牌麻辣锅底', features: ['32 味香料'] },
        script: '欢迎来到老王火锅店！招牌麻辣锅底，32 味香料秘制。',
        sceneUploads: [{ sceneIndex: 0, fileKey }],
      }),
    });
    const submitJ = await submitR.json();
    expect(submitJ.ok).toBe(true);
    const taskId = submitJ.data.taskId;

    // 3) 轮询直到 completed（最多 10s）
    let completed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const stR = await fetch(`${baseUrl}/api/proclips/mix/status/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const stJ = await stR.json();
      if (stJ.data.status === 'completed') {
        completed = true;
        expect(stJ.data.resultVideoUrl).toBeDefined();
        break;
      }
    }
    expect(completed).toBe(true);
  }, 15000);
});

describe('Video library & stats', () => {
  it('GET /api/proclips/merchant-videos', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/merchant-videos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(Array.isArray(j.data.videos)).toBe(true);
  });

  it('GET /api/proclips/merchant-stats', async () => {
    const r = await fetch(`${baseUrl}/api/proclips/merchant-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.data.videos).toBeDefined();
    expect(j.data.tasks).toBeDefined();
  });
});

describe('Cross-merchant isolation', () => {
  it('merchant A cannot access merchant B task', async () => {
    // 直接插入一个属于其他 merchant 的任务
    const db = getDb();
    db.prepare(
      `INSERT INTO video_mix_tasks (id, merchant_id, template_id, product_name, product_features_json, script, scene_clips_json, status)
       VALUES ('other_task', 'other-merchant', 'tpl_1', 'X', '[]', 'test', '[]', 'pending')`
    ).run();

    const r = await fetch(`${baseUrl}/api/proclips/mix/status/other_task`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    expect(r.status).toBe(403);
    expect(j.error.code).toBe('FORBIDDEN');
  });
});

// 回归 #3：mix/submit 模板不存在时返回 404 (而不是 200 + 错误体)
describe('HTTP status code regression', () => {
  it('mix/submit with invalid templateId returns 404', async () => {
    // 先上传一个分镜（用合法的 fileKey 绕过 FORBIDDEN_CLIPS）
    const db = getDb();
    const fileKey = `merchants/test-merchant-001/clips/regression_${Date.now()}.mp4`;
    db.prepare(
      `INSERT INTO video_raw_clips (id, merchant_id, template_id, scene_index, file_key, file_name, file_size, mime_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    ).run(`clip_regression_${Date.now()}`, 'test-merchant-001', 'tpl_1', 0, fileKey, 'r.mp4', 1, 'video/mp4');

    const r = await fetch(`${baseUrl}/api/proclips/mix/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        templateId: 'tpl_nonexistent_9999',
        product: { name: 'X', features: [] },
        script: 'test',
        sceneUploads: [{ sceneIndex: 0, fileKey }],
      }),
    });
    const j = await r.json();
    expect(r.status).toBe(404);  // 回归点：之前是 200
    expect(j.error.code).toBe('TEMPLATE_NOT_FOUND');
  });
});

// 回归 #1：progress 不能是 NaN / 立即跳到 1.0
describe('Mix worker progress regression', () => {
  it('progress is a finite number between 0.05 and 1.0 (not NaN, not immediately 1.0)', async () => {
    // 准备 1 个分镜
    const db = getDb();
    const fileKey = `merchants/test-merchant-001/clips/progress_${Date.now()}.mp4`;
    db.prepare(
      `INSERT INTO video_raw_clips (id, merchant_id, template_id, scene_index, file_key, file_name, file_size, mime_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    ).run(`clip_progress_${Date.now()}`, 'test-merchant-001', 'tpl_1', 0, fileKey, 'p.mp4', 1, 'video/mp4');

    // 提交任务
    const submitR = await fetch(`${baseUrl}/api/proclips/mix/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        templateId: 'tpl_1',
        product: { name: 'X', features: [] },
        script: 'test',
        sceneUploads: [{ sceneIndex: 0, fileKey }],
      }),
    });
    const submitJ = await submitR.json();
    const taskId = submitJ.data.taskId;

    // 第一个 poll：status 应为 pending 或 processing，progress 应该是有限数字
    await new Promise(r => setTimeout(r, 300));
    const stR = await fetch(`${baseUrl}/api/proclips/mix/status/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stJ = await stR.json();
    // 回归点：progress 必须是有限数，不能是 NaN
    expect(Number.isFinite(stJ.data.progress)).toBe(true);
    expect(stJ.data.progress).toBeGreaterThanOrEqual(0);
    expect(stJ.data.progress).toBeLessThanOrEqual(1);
  });
});
