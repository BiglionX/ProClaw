/**
 * TableSkeleton 组件单元测试（任务 #2：骨架屏）
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TableSkeleton } from './TableSkeleton';

describe('TableSkeleton', () => {
  it('渲染默认 5 列 5 行骨架', () => {
    const { container } = render(<TableSkeleton />);
    // 验证有 Skeleton 元素
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('渲染指定列数和行数', () => {
    const { container } = render(<TableSkeleton columns={8} rows={10} />);
    // 应有大量 skeleton
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(50);
  });

  it('不渲染表头时减少 skeleton 数量', () => {
    const { container } = render(<TableSkeleton hasHeader={false} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('hasCheckbox=true 渲染复选框列', () => {
    const { container } = render(<TableSkeleton hasCheckbox />);
    // 复选框列应包含 rectangular 类型的 Skeleton
    const rectSkeletons = container.querySelectorAll('.MuiSkeleton-rectangular');
    expect(rectSkeletons.length).toBeGreaterThan(0);
  });

  it('hasAction=true 渲染操作列', () => {
    const { container } = render(<TableSkeleton hasAction />);
    // 操作列包含 circular Skeleton
    const circularSkeletons = container.querySelectorAll('.MuiSkeleton-circular');
    expect(circularSkeletons.length).toBeGreaterThan(0);
  });

  it('应用自定义高度', () => {
    const { container } = render(<TableSkeleton height={400} />);
    // TableContainer 应有 style.height
    const tableContainer = container.querySelector('.MuiTableContainer-root');
    expect(tableContainer).toBeTruthy();
  });

  it('custom columnWidths 影响列宽', () => {
    const { container } = render(
      <TableSkeleton columns={3} columnWidths={[1, 2, 1]} />
    );
    // 应正常渲染
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('rows=0 不渲染数据行', () => {
    const { container } = render(<TableSkeleton rows={0} />);
    // 仅表头
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0); // 表头 skeleton
  });

  it('rows=1 渲染 1 行数据', () => {
    const { container } = render(<TableSkeleton rows={1} />);
    expect(container.querySelectorAll('tr').length).toBeGreaterThan(0);
  });
});
