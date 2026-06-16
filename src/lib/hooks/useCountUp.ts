/**
 * 数字计数动画 Hook（PRD v11.0 §4.1.3）
 *
 * 自研实现，使用 requestAnimationFrame + easeOutExpo 缓动函数
 * 在 500-800ms 内从 0 滚动到目标值
 *
 * 特点：
 * - 支持 number / string 类型
 * - 支持带单位的字符串（如 ¥28.5万、99+）
 * - 缓动函数：easeOutExpo（前期快，后期慢，更自然）
 * - 仅在 target 变化时触发动画
 */

import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  /** 动画持续时间（ms），默认 600 */
  duration?: number;
  /** 是否启用动画，默认 true */
  enabled?: boolean;
}

export function useCountUp(
  target: number | string,
  options: UseCountUpOptions = {}
): string {
  const { duration = 600, enabled = true } = options;
  const [display, setDisplay] = useState<string>(formatInitialValue(target));
  const prevTarget = useRef<string>('');
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplay(String(target));
      return;
    }

    const targetStr = String(target);
    if (targetStr === prevTarget.current) return;
    prevTarget.current = targetStr;

    // 如果不是有效数字，或 target 为 0，直接显示
    if (target === 0 || isNaN(Number(target))) {
      setDisplay(targetStr);
      return;
    }

    const numTarget = Number(target);
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(eased * numTarget);
      setDisplay(current.toLocaleString('zh-CN'));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
      }
    };

    // 取消上一次未完成的动画
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [target, duration, enabled]);

  return display;
}

/** 格式化初始值（用于无动画时的 SSR 兜底） */
function formatInitialValue(target: number | string): string {
  if (typeof target === 'number') {
    return target.toLocaleString('zh-CN');
  }
  return String(target);
}

export default useCountUp;
