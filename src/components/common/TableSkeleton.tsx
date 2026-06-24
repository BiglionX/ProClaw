/**
 * 表格骨架屏组件（任务 #2：骨架屏全面铺开）
 *
 * 用于列表页面 loading 时的占位展示
 * 比 CircularProgress 更友好（用户能预览内容结构）
 *
 * @example
 * <TableSkeleton columns={6} rows={5} />
 * <TableSkeleton columns={4} rows={8} hasCheckbox hasAction />
 */

import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

interface TableSkeletonProps {
  /** 列数 */
  columns?: number;
  /** 骨架行数 */
  rows?: number;
  /** 是否包含复选框列 */
  hasCheckbox?: boolean;
  /** 是否包含操作列（更宽） */
  hasAction?: boolean;
  /** 高度，默认自适应 */
  height?: number | string;
  /** 列宽比例（如 [1, 2, 1, 1, 1, 1]） */
  columnWidths?: number[];
  /** 是否显示表头骨架 */
  hasHeader?: boolean;
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  hasCheckbox = false,
  hasAction = true,
  height,
  columnWidths,
  hasHeader = true,
}: TableSkeletonProps) {
  const widths = columnWidths || Array(columns).fill(1);

  return (
    <TableContainer component={Paper} sx={height ? { height } : undefined}>
      <Table size="small">
        {hasHeader && (
          <TableHead>
            <TableRow>
              {hasCheckbox && (
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={20} height={20} />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, i) => (
                <TableCell key={i}>
                  <Skeleton
                    variant="text"
                    width={`${(widths[i] || 1) * 60}%`}
                    height={24}
                  />
                </TableCell>
              ))}
              {hasAction && (
                <TableCell align="right">
                  <Skeleton variant="text" width="60%" height={24} sx={{ ml: 'auto' }} />
                </TableCell>
              )}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx} hover>
              {hasCheckbox && (
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={20} height={20} />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  <Skeleton
                    variant="text"
                    width={`${Math.min(95, 60 + ((rowIdx + colIdx) % 3) * 15)}%`}
                    height={20}
                  />
                </TableCell>
              ))}
              {hasAction && (
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="circular" width={24} height={24} />
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default TableSkeleton;
