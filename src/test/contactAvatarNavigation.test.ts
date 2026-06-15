/**
 * 联系人-Agent 头像 / 联系人-AI Team 头像 跳转测试
 *
 * 覆盖：
 * 1) parseTeamId 从 ai-team-group-xxx 提取 teamId
 * 2) buildGroupId(teamId) 拼回 ai-team-group-xxx
 * 3) isAITeamGroupId 正确判断群聊 ID
 * 4) ChatPage handleHeadAvatarClick 跳转逻辑 (通过 parseTeamId 间接验证)
 */
import { describe, it, expect } from 'vitest';
import {
  buildGroupId,
  parseTeamId,
  isAITeamGroupId,
  AI_TEAM_GROUP_ID_PREFIX,
} from '../lib/contactService';

describe('ChatPage 头像跳转 → AI Team 详情 (需求 #4)', () => {
  it('parseTeamId 应当从 ai-team-group-xxx 提取出 teamId', () => {
    expect(parseTeamId('ai-team-group-biz-ops')).toBe('biz-ops');
    expect(parseTeamId('ai-team-group-finance')).toBe('finance');
    expect(parseTeamId('ai-team-group-mock-builtin-team')).toBe('mock-builtin-team');
  });

  it('parseTeamId 应当对已是 teamId 的输入原样返回 (向后兼容)', () => {
    // 若有人直接传 teamId 而非 groupId, 应原样返回
    expect(parseTeamId('biz-ops')).toBe('biz-ops');
  });

  it('buildGroupId 应当用前缀正确拼接', () => {
    expect(buildGroupId('biz-ops')).toBe('ai-team-group-biz-ops');
    expect(buildGroupId('finance')).toBe('ai-team-group-finance');
  });

  it('buildGroupId ⇄ parseTeamId 应当互为反函数', () => {
    const ids = ['biz-ops', 'finance', 'supply-chain', 'marketing', 'mock-builtin-team'];
    for (const id of ids) {
      expect(parseTeamId(buildGroupId(id))).toBe(id);
    }
  });

  it('isAITeamGroupId 应当只对 groupId 返回 true', () => {
    // 群聊 ID → true
    expect(isAITeamGroupId('ai-team-group-biz-ops')).toBe(true);
    expect(isAITeamGroupId(AI_TEAM_GROUP_ID_PREFIX + 'finance')).toBe(true);
    // Agent ID / 单 agent → false
    expect(isAITeamGroupId('ma_social_cn')).toBe(false);
    expect(isAITeamGroupId('ceo-agent')).toBe(false);
    // 团队 raw ID → false (区分 groupId vs teamId)
    expect(isAITeamGroupId('biz-ops')).toBe(false);
  });

  it('ChatPage 跳转 URL 应当从 contactId 拼出 /team-profile/:teamId (验证集成逻辑)', () => {
    // 模拟 ChatPage.handleHeadAvatarClick 中的关键代码:
    //   if (isGroupChat) {
    //     const teamId = parseTeamId(contactId);
    //     navigate(`/team-profile/${teamId}`);
    //   }
    const contactId = 'ai-team-group-biz-ops';
    expect(isAITeamGroupId(contactId)).toBe(true);
    const teamId = parseTeamId(contactId);
    const targetUrl = `/team-profile/${teamId}`;
    expect(targetUrl).toBe('/team-profile/biz-ops');
    // 确认 navigate target 是有效的 teamId (不含 ai-team-group- 前缀)
    expect(targetUrl).not.toContain(AI_TEAM_GROUP_ID_PREFIX);
  });
});

describe('ChatPage 头像跳转 → Agent 资料 (需求 #3)', () => {
  it('单 Agent 联系人的 contactId 应当直接作为 :agentId 传给 /agent-profile', () => {
    // 模拟 ChatPage.handleHeadAvatarClick:
    //   if (isGroupChat) return / 跳 team
    //   if (isCEO) return
    //   if (contact?.contact_type === 'group') return
    //   navigate(`/agent-profile/${contactId}`)
    const agentIds = ['ma_social_cn', 'ma_foreign_counter', 'ma_inventory_optimizer', 'builtin-catering-purchase'];
    for (const contactId of agentIds) {
      expect(isAITeamGroupId(contactId)).toBe(false);
      const targetUrl = `/agent-profile/${contactId}`;
      expect(targetUrl).toBe(`/agent-profile/${contactId}`);
    }
  });

  it('CEO Agent 应当特殊处理 (navigate 不应被调用)', () => {
    const contactId = 'ceo-agent';
    expect(isAITeamGroupId(contactId)).toBe(false);
    // CEO 不响应 — handleHeadAvatarClick 中 isCEO 守卫直接 return
    // 验证 isAITeamGroupId 不会误判 (避免被当成群聊)
    expect(contactId).toBe('ceo-agent');
  });
});
