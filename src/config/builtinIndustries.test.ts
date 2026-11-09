import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_INDUSTRIES } from '../components/SetupWizard/IndustrySelector';
import { PluginManager, useAppModeStore } from './appMode';

describe('内置行业接线', () => {
  beforeEach(() => {
    useAppModeStore.setState({
      mode: 'inventory',
      activePlugin: null,
      installedPlugins: [],
    });
  });

  it('向导行业列表包含餐饮、美业、宠物', () => {
    const ids = DEFAULT_INDUSTRIES.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(['catering', 'beauty', 'pet']));
  });

  it('选中餐饮后 activePlugin 为 catering，导航含 /pos', async () => {
    const pm = PluginManager.getInstance();
    await pm.setIndustry('catering');
    expect(pm.getActiveIndustry()).toBe('catering');
    expect(pm.getPlugin()?.id).toBe('catering');
    expect(pm.getNavItems().map((item) => item.path)).toContain('/pos');
  });

  it('选中美业和宠物后导航分别含预约和宠物档案', async () => {
    const pm = PluginManager.getInstance();
    await pm.setIndustry('beauty');
    expect(pm.getPlugin()?.id).toBe('beauty');
    expect(pm.getNavItems().map((item) => item.path)).toContain('/appointments');

    await pm.setIndustry('pet');
    expect(pm.getPlugin()?.id).toBe('pet');
    expect(pm.getNavItems().map((item) => item.path)).toContain('/pets');
  });
});
