/**
 * Hermes Skills P2 单测 — HermesApi
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHermesBundle,
  HermesApi,
  InMemoryDatabase,
  PRESET_SKILLS,
} from './index';
import type { HermesBundle } from './index';
import type { Skill } from './types';

describe('HermesApi', () => {
  let bundle: HermesBundle;
  let api: HermesApi;

  beforeEach(async () => {
    bundle = createHermesBundle(new InMemoryDatabase());
    await bundle.seedPresets();
    api = new HermesApi(bundle);
  });

  it('listSkills returns every preset skill', async () => {
    const skills = await api.listSkills();
    expect(skills.length).toBe(PRESET_SKILLS.length);
  });

  it('listSkills with status filter', async () => {
    const active = await api.listSkills({ status: 'active' });
    expect(active.every((s) => s.status === 'active')).toBe(true);
    expect(active.length).toBeGreaterThan(0);
  });

  it('retrieveSkills finds sales skill', async () => {
    const scored = await api.retrieveSkills('本月营业额怎么样');
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].skill.id).toBe('sk_preset_sales_summary');
  });

  it('getSkill returns skill or null', async () => {
    const skill = await api.getSkill('sk_preset_inventory_alert');
    expect(skill?.id).toBe('sk_preset_inventory_alert');

    const missing = await api.getSkill('sk_does_not_exist');
    expect(missing).toBeNull();
  });

  it('statsBySource groups by source', async () => {
    const stats = await api.statsBySource();
    expect(stats.preset).toBe(PRESET_SKILLS.length);
  });

  it('statsByStatus groups by status', async () => {
    const stats = await api.statsByStatus();
    expect(stats.active).toBe(PRESET_SKILLS.length);
    expect(stats.pending_review ?? 0).toBe(0);
  });

  it('approveSkill transitions pending_review → active', async () => {
    const skill = await api.createSkillManually({
      name: '测试',
      description: 'd',
      triggerPhrases: ['t'],
      toolTemplates: [],
      source: 'learned',
      status: 'pending_review',
    });
    expect(skill.status).toBe('pending_review');

    const approved = await api.approveSkill(skill.id);
    expect(approved?.status).toBe('active');
  });

  it('rejectSkill transitions pending_review → archived', async () => {
    const skill = await api.createSkillManually({
      name: 't',
      description: 'd',
      triggerPhrases: ['x'],
      toolTemplates: [],
      source: 'learned',
      status: 'pending_review',
    });
    const rejected = await api.rejectSkill(skill.id);
    expect(rejected?.status).toBe('archived');
  });

  it('archiveSkill and reactivateSkill round trip', async () => {
    const skill = await api.createSkillManually({
      name: 't',
      description: 'd',
      triggerPhrases: ['x'],
      toolTemplates: [],
      source: 'preset',
      status: 'active',
    });
    const archived = await api.archiveSkill(skill.id);
    expect(archived?.status).toBe('archived');

    const reactivated = await api.reactivateSkill(skill.id);
    expect(reactivated?.status).toBe('active');
  });

  it('createSkillManually sets source=learned and status=active by default', async () => {
    const skill = await api.createSkillManually({
      name: 't',
      description: 'd',
      triggerPhrases: ['x'],
      toolTemplates: [],
    });
    expect(skill.source).toBe('learned');
    expect(skill.status).toBe('active');
    expect(skill.version).toBe(1);
  });

  it('testRetrieval uses activeOnly=true by default', async () => {
    const skill = await api.createSkillManually({
      name: 'fake-inventory',
      description: 'fake',
      triggerPhrases: ['库存'],
      toolTemplates: [],
      source: 'preset',
      status: 'archived', // 归档
    });
    const scored = await api.testRetrieval('库存');
    expect(scored.find((s) => s.skill.id === skill.id)).toBeUndefined();
  });

  it('listEvolutionLog returns empty array when evolver is null', async () => {
    const bare = new HermesApi(
      createHermesBundle(new InMemoryDatabase()),
    );
    const log = await bare.listEvolutionLog();
    expect(log).toEqual([]);
  });

  it('statsEvolutionByAction and evolutionSuccessRate', async () => {
    const bundleWithEvolver = createHermesBundle(new InMemoryDatabase());
    await bundleWithEvolver.seedPresets();
    bundleWithEvolver.bindLLMProvider(async () => ({
      invoke: async () => ({
        content: JSON.stringify({ action: 'noop', reasoning: 'mock' }),
      }),
    } as any));
    const api2 = new HermesApi(bundleWithEvolver);

    // 制造一条失败 trace,触发 evolver
    await api2.simulateFailureEvolution({
      agentName: 'TestAgent',
      query: 'test query',
      failureReason: 'mock failure',
    });

    const log = await api2.listEvolutionLog();
    expect(log.length).toBeGreaterThan(0);

    const stats = await api2.statsEvolutionByAction();
    expect(Object.keys(stats).length).toBeGreaterThan(0);

    const rate = await api2.evolutionSuccessRate();
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(1);
  });

  it('demoMoAResult returns shaped mock data', async () => {
    const demo = await api.demoMoAResult();
    expect(demo.triggered).toBe(true);
    expect(demo.proposals.length).toBeGreaterThan(0);
    expect(demo.verdictScores.length).toBeGreaterThan(0);
    expect(demo.confidence).toBeGreaterThan(0);
    expect(demo.finalOutput.length).toBeGreaterThan(0);
  });
});