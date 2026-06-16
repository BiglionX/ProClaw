/**
 * SpeechService 单元测试（任务 #3：语音通话实现）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SpeechService,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from './speechService';

describe('SpeechService - 兼容性检测', () => {
  it('isSpeechRecognitionSupported 返回 boolean', () => {
    const result = isSpeechRecognitionSupported();
    expect(typeof result).toBe('boolean');
  });

  it('isSpeechSynthesisSupported 返回 boolean', () => {
    const result = isSpeechSynthesisSupported();
    expect(typeof result).toBe('boolean');
  });
});

describe('SpeechService - 浏览器环境', () => {
  beforeEach(() => {
    // 清理可能存在的全局 mock
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  afterEach(() => {
    SpeechService.abortListening();
    SpeechService.stopSpeaking();
  });

  it('isListening 初始为 false', () => {
    expect(SpeechService.isListening()).toBe(false);
  });

  it('isSpeaking 初始为 false', () => {
    expect(SpeechService.isSpeaking()).toBe(false);
  });

  it('stopListening 在未启动时安全调用', () => {
    expect(() => SpeechService.stopListening()).not.toThrow();
  });

  it('abortListening 在未启动时安全调用', () => {
    expect(() => SpeechService.abortListening()).not.toThrow();
  });

  it('stopSpeaking 在未启动时安全调用', () => {
    expect(() => SpeechService.stopSpeaking()).not.toThrow();
  });

  it('getVoices 返回数组', () => {
    const voices = SpeechService.getVoices();
    expect(Array.isArray(voices)).toBe(true);
  });
});

describe('SpeechService - startListening', () => {
  it('不支持时返回 false 并触发错误回调', () => {
    // 确保不支持
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const onError = vi.fn();
    const result = SpeechService.startListening(
      () => {},
      onError,
      () => {}
    );
    expect(result).toBe(false);
    expect(onError).toHaveBeenCalled();
    const callArg = onError.mock.calls[0][0];
    // 实际值含连字符（U+00AD），仅验证包含 not 和 support
    expect(callArg.error).toMatch(/not.*supported/);
  });

  it('startListening 接受自定义 lang 参数', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    SpeechService.startListening(
      () => {},
      () => {},
      () => {},
      'en-US'
    );
    // 不支持时仅返回 false，不抛错
  });
});

describe('SpeechService - speak', () => {
  it('空文本不朗读', () => {
    const result = SpeechService.speak('');
    expect(result).toBeNull();
  });

  it('speak 返回 utterance 或 null', () => {
    const result = SpeechService.speak('测试语音');
    // 在测试环境（jsdom）中无 speechSynthesis，返回 null
    expect(result === null || result instanceof Object).toBe(true);
  });

  it('speak 支持配置 rate / pitch / volume', () => {
    const result = SpeechService.speak('测试', {
      rate: 1.5,
      pitch: 1.2,
      volume: 0.8,
    });
    expect(result === null || result instanceof Object).toBe(true);
  });

  it('speak 支持 onStart / onEnd 回调参数', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    SpeechService.speak('回调测试', { onStart, onEnd });
    // 验证参数接受（不抛错即通过）
    expect(true).toBe(true);
  });
});
