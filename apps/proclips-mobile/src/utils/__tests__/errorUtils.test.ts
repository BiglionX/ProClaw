/**
 * errorUtils 单元测试
 * P1.x 任务：覆盖 getErrorMessage / toError / logError 全部分支
 */
import { getErrorMessage, toError, logError } from '../errorUtils';
import { logger } from '../logger';

// mock logger 避免污染测试输出
jest.mock('../logger', () => ({
  logger: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('errorUtils - getErrorMessage', () => {
  it('Error 实例：返回 .message', () => {
    const err = new Error('boom');
    expect(getErrorMessage(err)).toBe('boom');
  });

  it('TypeError 子类：返回 .message', () => {
    expect(getErrorMessage(new TypeError('not a function'))).toBe('not a function');
  });

  it('Error.message 为空字符串时返回 fallback', () => {
    const err = new Error('');
    expect(getErrorMessage(err, '兜底')).toBe('兜底');
  });

  it('string 类型：原样返回', () => {
    expect(getErrorMessage('network fail')).toBe('network fail');
  });

  it('number 类型：转字符串', () => {
    expect(getErrorMessage(500)).toBe('500');
  });

  it('boolean 类型：转字符串', () => {
    expect(getErrorMessage(false)).toBe('false');
  });

  it('null：返回 fallback', () => {
    expect(getErrorMessage(null, '默认')).toBe('默认');
  });

  it('undefined：返回 fallback', () => {
    expect(getErrorMessage(undefined, '默认')).toBe('默认');
  });

  it('null 无 fallback：返回 "未知错误" 默认值', () => {
    expect(getErrorMessage(null)).toBe('未知错误');
  });

  it('对象含 .message 字段（fetch 风格）：返回该字段', () => {
    expect(getErrorMessage({ message: 'rate limit' })).toBe('rate limit');
  });

  it('对象含 .code 字段（API 错误风格）：返回该字段', () => {
    expect(getErrorMessage({ code: 'AUTH_001' })).toBe('AUTH_001');
    expect(getErrorMessage({ code: 500 })).toBe('500');
  });

  it('对象同时含 message 和 code：优先 message', () => {
    expect(getErrorMessage({ message: 'm', code: 'c' })).toBe('m');
  });

  it('对象无 message/code：返回 fallback', () => {
    expect(getErrorMessage({ foo: 1 }, 'no msg')).toBe('no msg');
  });

  it('对象 message 为非字符串：返回 fallback', () => {
    expect(getErrorMessage({ message: 123 }, 'fallback')).toBe('fallback');
  });

  it('数组：返回 fallback（不是对象常见错误形态）', () => {
    expect(getErrorMessage([1, 2, 3], 'arr')).toBe('arr');
  });

  it('Symbol：返回 fallback', () => {
    expect(getErrorMessage(Symbol('x'), 'sym')).toBe('sym');
  });
});

describe('errorUtils - toError', () => {
  it('Error 实例：原样返回', () => {
    const original = new Error('original');
    const result = toError(original);
    expect(result).toBe(original);
    expect(result.message).toBe('original');
  });

  it('TypeError：原样返回', () => {
    const original = new TypeError('type');
    expect(toError(original)).toBe(original);
  });

  it('string：合成 Error 用原 string', () => {
    const result = toError('boom');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('boom');
  });

  it('普通对象含 .message：合成 Error 用该 message', () => {
    const result = toError({ message: 'fetch failed' });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('fetch failed');
  });

  it('null + 自定义 fallbackMessage', () => {
    const result = toError(null, 'default-msg');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('default-msg');
  });

  it('数字：合成 Error', () => {
    const result = toError(500);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('500');
  });
});

describe('errorUtils - logError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Error：调用 logger.warn 并返回 message', () => {
    const result = logError('XxxService', new Error('fail'));
    expect(result).toBe('fail');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      '[XxxService] fail',
      expect.any(Error),
    );
  });

  it('string：调用 logger.warn 并返回 string', () => {
    const result = logError('XxxService', 'string error');
    expect(result).toBe('string error');
    expect(logger.warn).toHaveBeenCalledWith(
      '[XxxService] string error',
      'string error',
    );
  });

  it('null + fallback：调用 logger.warn 并返回 fallback', () => {
    const result = logError('XxxService', null, '兜底文案');
    expect(result).toBe('兜底文案');
    expect(logger.warn).toHaveBeenCalledWith(
      '[XxxService] 兜底文案',
      null,
    );
  });

  it('无 fallback：默认返回 "未知错误"', () => {
    const result = logError('XxxService', undefined);
    expect(result).toBe('未知错误');
  });
});
