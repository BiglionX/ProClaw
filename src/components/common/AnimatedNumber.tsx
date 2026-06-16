/**
 * 数字显示组件（包装 useCountUp Hook）
 *
 * 用于业务页面关键数字的滚动动画展示
 * 可选前缀/后缀（如 ¥、%）
 *
 * @example
 * <AnimatedNumber value={1234} prefix="¥" />
 * <AnimatedNumber value={50.5} suffix="%" decimals={1} />
 */

import { useCountUp } from '../../lib/hooks/useCountUp';

interface AnimatedNumberProps {
  /** 目标数值 */
  value: number | string;
  /** 前缀（如 ¥） */
  prefix?: string;
  /** 后缀（如 %、万） */
  suffix?: string;
  /** 小数位数 */
  decimals?: number;
  /** 动画持续时间（ms） */
  duration?: number;
  /** 是否启用动画 */
  enabled?: boolean;
  /** 自定义 className */
  className?: string;
  /** 字体变体 */
  variant?: 'inherit' | 'body1' | 'body2' | 'caption' | 'h6' | 'h5' | 'h4' | 'h3' | 'h2' | 'h1';
  /** 颜色 */
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'text.primary' | 'text.secondary';
  /** 字体粗细 */
  fontWeight?: number | string;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 600,
  enabled = true,
  className,
  variant = 'inherit',
  color,
  fontWeight,
}: AnimatedNumberProps) {
  const display = useCountUp(value, { duration, enabled });

  // 格式化带小数位的值
  const formatted = decimals > 0 && !isNaN(Number(value))
    ? Number(display).toFixed(decimals)
    : display;

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: fontWeight as any,
        color: color as any,
        fontVariant: variant as any,
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;
