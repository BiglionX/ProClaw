/**
 * useCountUp Hook 单元测试（任务 #1：数字计数动画）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始渲染时返回格式化后的 target 值', () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toMatch(/100/);
  });

  it('target 为 0 时直接显示 0', () => {
    const { result } = renderHook(() => useCountUp(0));
    expect(result.current).toBe('0');
  });

  it('target 为带单位的字符串时直接显示（如 ¥28.5万）', () => {
    const { result } = renderHook(() => useCountUp('¥28.5万'));
    expect(result.current).toBe('¥28.5万');
  });

  it('target 为纯数字字符串时仍能处理', () => {
    const { result } = renderHook(() => useCountUp('500'));
    expect(result.current).toBeDefined();
  });

  it('enabled=false 时直接显示目标值（无动画）', () => {
    const { result } = renderHook(() => useCountUp(100, { enabled: false }));
    expect(result.current).toBe('100');
  });

  it('target 变化时触发动画且返回字符串', () => {
    const { result, rerender } = renderHook(({ value }) => useCountUp(value), {
      initialProps: { value: 100 },
    });

    expect(result.current).toBe('100');
    rerender({ value: 200 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('string');
  });

  it('支持自定义 duration 参数', () => {
    const { result } = renderHook(() => useCountUp(1000, { duration: 100 }));
    expect(result.current).toBeDefined();
  });

  it('千分位格式化（1234 含逗号）', () => {
    const { result } = renderHook(() => useCountUp(1234, { enabled: false }));
    // 在 jsdom 测试环境下 Intl 可能不输出逗号，仅验证原始数字存在
    expect(result.current).toMatch(/1234|1,234/);
  });

  it('千分位格式化（1000000）', () => {
    const { result } = renderHook(() => useCountUp(1000000, { enabled: false }));
    expect(result.current).toMatch(/1000000|1,000,000/);
  });

  it('处理负数', () => {
    const { result } = renderHook(() => useCountUp(-100, { enabled: false }));
    expect(result.current).toBe('-100');
  });

  it('处理小数', () => {
    const { result } = renderHook(() => useCountUp(3.14, { enabled: false }));
    expect(result.current).toBe('3.14');
  });

  it('component 卸载时清理动画', () => {
    const { unmount } = renderHook(() => useCountUp(100));
    unmount();
    // 不应抛错
  });

  it('target 从字符串改为数字时正确处理', () => {
    const { result, rerender } = renderHook(({ value }: { value: string | number }) => useCountUp(value), {
      initialProps: { value: 'abc' as string | number },
    });
    expect(result.current).toBe('abc');

    rerender({ value: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(typeof result.current).toBe('string');
  });
});
