import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import { useCountUp } from '../../lib/hooks/useCountUp';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  subtitle?: string;
  /** 迷你趋势数据 (可选) */
  sparklineData?: { value: number }[];
  /** 库存预警标记 */
  alert?: boolean;
  /** 颜色映射名（用于主题色） */
  colorName?: string;
  /** 是否启用计数动画（默认 true） */
  countUpEnabled?: boolean;
  /** 动画持续时间（ms） */
  countUpDuration?: number;
}

export default function StatCard({
  title, value, icon, color, change, subtitle, sparklineData, alert = false,
  countUpEnabled = true, countUpDuration = 600,
}: StatCardProps) {
  const displayValue = useCountUp(value, { enabled: countUpEnabled, duration: countUpDuration });

  const colorMap: Record<string, string> = {
    primary: '#FF3B30',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#6366F1',
    error: '#FF3B30',
  };

  const mainColor = colorMap[color] || color;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: alert ? 'rgba(255,59,48,0.3)' : 'divider',
        borderRadius: 2,
        position: 'relative',
        overflow: 'visible',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
          borderColor: mainColor,
        },
        // 异常闪烁动画
        ...(alert ? {
          animation: 'alertPulse 2s ease-in-out infinite',
          '@keyframes alertPulse': {
            '0%, 100%': { borderColor: 'rgba(255,59,48,0.3)' },
            '50%': { borderColor: 'rgba(255,59,48,0.7)' },
          },
        } : {}),
      }}
    >
      {/* 顶部渐变条 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${mainColor} 0%, transparent 100%)`,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      />

      <CardContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          {/* 左侧图标 */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${mainColor}12`,
              color: mainColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          {/* 右侧迷你趋势线 */}
          {sparklineData && sparklineData.length > 1 && (
            <Box sx={{ width: 80, height: 32, ml: 1, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`sparkline-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={mainColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={mainColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={mainColor}
                    strokeWidth={1.5}
                    fill={`url(#sparkline-${title})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>

        {/* 数字值 */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: '1.75rem',
            mb: 0.25,
            color: '#1A1A2E',
            fontVariantNumeric: 'tabular-nums',
            transition: 'all 0.3s',
          }}
        >
          {displayValue}
        </Typography>

        {/* 标题 + 变化 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {change && (
            <Chip
              label={change}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: change.startsWith('+') || change.startsWith('↑')
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(239,68,68,0.1)',
                color: change.startsWith('+') || change.startsWith('↑')
                  ? '#10B981'
                  : '#EF4444',
              }}
            />
          )}
        </Box>

        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
