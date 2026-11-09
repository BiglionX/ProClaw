import { describe, expect, it } from 'vitest';
import { visibleChatError } from './chatFailure';

describe('visibleChatError', () => {
  it('把缺少发送者显示为未登录', () => {
    expect(visibleChatError(new Error('缺少发送者'))).toBe('未登录');
  });

  it('保留未配置模型原文', () => {
    expect(visibleChatError(new Error('未配置模型。请在设置页配置 DeepSeek 或其他大模型 API。'))).toContain(
      '未配置模型',
    );
  });

  it('把默认端点 404 显示为模型服务不可用', () => {
    expect(visibleChatError(new Error('404 MODEL_NOT_FOUND'))).toBe('模型服务不可用');
  });

  it('外键错误原样显示，不收成笼统服务器文案', () => {
    expect(visibleChatError(new Error('FOREIGN KEY constraint failed'))).toBe(
      'FOREIGN KEY constraint failed',
    );
  });
});
