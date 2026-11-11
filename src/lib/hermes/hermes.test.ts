/**
 * Hermes Skills P0-A 单测
 *
 * 不依赖 LLM,只验证:
 * - 预设技能能正确入库
 * - 中英文 query 都能命中
 * - buildSystemPromptAddition 输出格式正确
 * - recordUsage 计数正确
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHermesBundle, InMemoryDatabase, PRESET_SKILLS } from './index';
import type { HermesBundle } from './index';

describe('Hermes SkillStore + SkillRetriever (P0-A)', () => {
  let bundle: HermesBundle;

  beforeEach(async () => {
    const db = new InMemoryDatabase();
    bundle = createHermesBundle(db);
    await bundle.seedPresets();
  });

  it('imports every preset skill', async () => {
    expect(await bundle.store.count()).toBe(PRESET_SKILLS.length);
    const all = await bundle.store.list({ limit: 100 });
    expect(all.find((s) => s.id === 'sk_preset_inventory_alert')).toBeTruthy();
  });

  it('retrieves low-stock skill by Chinese query', async () => {
    const scored = await bundle.retriever.retrieve('哪些商品快卖完了');
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].skill.id).toBe('sk_preset_inventory_alert');
  });

  it('retrieves sales skill by Chinese query', async () => {
    const scored = await bundle.retriever.retrieve('本周营业额怎么样');
    expect(scored[0]?.skill.id).toBe('sk_preset_sales_summary');
  });

  it('retrieves crm skill by Chinese query', async () => {
    const scored = await bundle.retriever.retrieve('哪些客户很久没联系了');
    expect(scored[0]?.skill.id).toBe('sk_preset_crm_followup');
  });

  it('retrieves coupon skill by Chinese query', async () => {
    const scored = await bundle.retriever.retrieve('群发优惠券');
    expect(scored[0]?.skill.id).toBe('sk_preset_social_coupon');
  });

  it('retrieves beauty reschedule skill by Chinese query', async () => {
    const scored = await bundle.retriever.retrieve('改预约');
    expect(scored[0]?.skill.id).toBe('sk_preset_beauty_reschedule');
  });

  it('retrieves export skill by English-Chinese mixed query', async () => {
    const scored = await bundle.retriever.retrieve('帮我导出销售数据 Excel');
    expect(scored[0]?.skill.id).toBe('sk_preset_export_data');
  });

  it('returns empty array for irrelevant query', async () => {
    const scored = await bundle.retriever.retrieve('今天天气真好');
    expect(scored.length).toBe(0);
  });

  it('respects activeOnly filter', async () => {
    // 先归档一个,验证不会出现在结果中
    const sales = (await bundle.store.getById('sk_preset_sales_summary'))!;
    await bundle.store.upsert({ ...sales, status: 'archived' });
    const scored = await bundle.retriever.retrieve('本月销售数据', { activeOnly: true });
    expect(scored.find((s) => s.skill.id === 'sk_preset_sales_summary')).toBeUndefined();
  });

  it('buildSystemPromptAddition returns well-formed markdown', async () => {
    const scored = await bundle.retriever.retrieve('库存不足');
    const addition = bundle.retriever.buildSystemPromptAddition(scored);
    expect(addition).toContain('<hermes_skills>');
    expect(addition).toContain('</hermes_skills>');
    expect(addition).toContain('Skill #1');
    expect(addition).toContain('可用工具');
  });

  it('recordUsage updates counters', async () => {
    const before = (await bundle.store.getById('sk_preset_inventory_alert'))!;
    await bundle.store.recordUsage(before.id, true);
    await bundle.store.recordUsage(before.id, false);
    const after = (await bundle.store.getById(before.id))!;
    expect(after.usageCount).toBe(before.usageCount + 2);
    expect(after.successCount).toBe(before.successCount + 1);
    expect(after.failureCount).toBe(before.failureCount + 1);
  });

  it('upsert creates new skill with version=1', async () => {
    const skill = await bundle.store.upsert({
      name: '测试技能',
      description: '单元测试用',
      triggerPhrases: ['test'],
      toolTemplates: [],
      source: 'learned',
    });
    expect(skill.version).toBe(1);
    expect(skill.source).toBe('learned');
    expect(skill.id.startsWith('sk_')).toBe(true);
  });

  it('upsert updates existing skill with version+1', async () => {
    const before = (await bundle.store.getById('sk_preset_inventory_alert'))!;
    // version 不传时(而非显式传入旧版本)才自增 —— SkillEvolver 会显式传 version
    const after = await bundle.store.upsert({
      ...before,
      version: undefined,
      description: '更新后的描述',
    });
    expect(after.id).toBe(before.id);
    expect(after.version).toBe(before.version + 1);
    expect(after.description).toBe('更新后的描述');
  });

  it('topK limits returned skills', async () => {
    const scored = await bundle.retriever.retrieve('查询', { topK: 2 });
    expect(scored.length).toBeLessThanOrEqual(2);
  });
});
