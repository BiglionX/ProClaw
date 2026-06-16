/**
 * 统计卡片骨架屏组件（任务 #2：骨架屏全面铺开）
 *
 * 用于仪表盘/数据中心/财务概览等场景的 loading 占位
 *
 * @example
 * <StatCardSkeleton count={4} />
 */

import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

interface StatCardSkeletonProps {
  /** 卡片数量 */
  count?: number;
  /** 是否带迷你趋势图 */
  hasSparkline?: boolean;
  /** Grid item xs，默认 3（12/3=4列） */
  xs?: number;
  /** Grid item sm */
  sm?: number;
}

export function StatCardSkeleton({
  count = 4,
  hasSparkline = true,
  xs = 6,
  sm = 3,
}: StatCardSkeletonProps) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, idx) => (
        <Grid item xs={xs} sm={sm} key={idx}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                {/* 图标占位 */}
                <Skeleton variant="rounded" width={44} height={44} />

                {/* sparkline 占位 */}
                {hasSparkline && (
                  <Skeleton variant="rounded" width={80} height={32} />
                )}
              </Box>

              {/* 数字占位 */}
              <Skeleton variant="text" sx={{ fontSize: '1.75rem', width: '60%' }} />

              {/* 标题占位 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Skeleton variant="text" sx={{ fontSize: '0.85rem', width: '40%' }} />
                <Skeleton variant="rounded" width={50} height={20} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default StatCardSkeleton;
