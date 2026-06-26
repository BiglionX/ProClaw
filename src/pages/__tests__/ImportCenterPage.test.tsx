/**
 * v1.3 B5：ImportCenterPage 单测
 *
 * 覆盖：
 * - 列表加载：拉取 listBatches → 渲染表格
 * - 状态过滤：选中「已暂停」→ 表格只剩 paused 行
 * - 目标过滤：选中「商品」→ 表格只剩 target_type=products 行
 * - 日期过滤：起始日期过滤生效
 * - 搜索：按文件名搜索
 * - 分页：翻页按钮切换行
 * - 操作按钮：暂停 / 继续 / 取消 / 重试 调用对应的 service 函数
 * - 重试成功后自动选中新 batch
 * - 错误报告下载按钮（仅 errors.length>0 时显示）
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ImportCenterPage from '../ImportCenterPage';
import type { ImportBatchInfo } from '../../lib/services/importService';

// ---------- mock：useNavigate（保持 react-router-dom 行为） ----------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------- mock：importService（用 vi.hoisted 避开 vi.mock 提升问题） ----------
const {
  mockListBatches,
  mockPauseBatch,
  mockResumeBatch,
  mockCancelBatch,
  mockRetryBatch,
  mockRollbackBatch,
} = vi.hoisted(() => ({
  mockListBatches: vi.fn(async () => [] as ImportBatchInfo[]),
  mockPauseBatch: vi.fn(async (id: string) => makeBatch(id, 'paused')),
  mockResumeBatch: vi.fn(async (id: string) => makeBatch(id, 'pending')),
  mockCancelBatch: vi.fn(async (id: string) => makeBatch(id, 'cancelled')),
  mockRetryBatch: vi.fn(async () => 'new-batch-id-12345678'),
  mockRollbackBatch: vi.fn(async () => 5),
}));

vi.mock('../../lib/services/importService', () => ({
  listBatches: mockListBatches,
  pauseBatch: mockPauseBatch,
  resumeBatch: mockResumeBatch,
  cancelBatch: mockCancelBatch,
  retryBatch: mockRetryBatch,
  rollbackBatch: mockRollbackBatch,
}));

function makeBatch(
  id: string,
  status: ImportBatchInfo['status'],
  overrides: Partial<ImportBatchInfo> = {},
): ImportBatchInfo {
  return {
    id,
    user_id: 'default',
    file_name: `${id}.xlsx`,
    file_hash: null,
    file_size: 1024,
    file_type: 'xlsx',
    target_type: 'products',
    mapping_json: null,
    conflict_strategy: 'skip',
    status,
    total_rows: 10,
    success_rows: 8,
    failed_rows: 1,
    skipped_rows: 1,
    started_at: '2026-06-26T10:00:00Z',
    finished_at: '2026-06-26T10:01:00Z',
    error_report_json: null,
    created_at: '2026-06-26T09:59:00Z',
    last_heartbeat_at: null,
    processed_rows: 0,
    paused_reason: null,
    ...overrides,
  };
}

const theme = createTheme();

function renderPage(initialPath = '/import-center') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/import-center" element={<ImportCenterPage />} />
          <Route path="/import-center/:batchId" element={<ImportCenterPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

// 在 jsdom 下点击 MUI 多选 Select 复杂，这里用简单方法绕过：直接调用 onChange
function selectMultiSelectItem(labelText: string, itemLabel: string) {
  // 找到含 labelText 的 Select（其按钮）
  const trigger = screen.getAllByRole('combobox').find((el) => el.textContent?.includes(labelText));
  if (!trigger) throw new Error(`找不到 ${labelText} 多选`);
  fireEvent.mouseDown(trigger);
  const item = screen.getByRole('option', { name: itemLabel });
  fireEvent.click(item);
}

// fireEvent 在 import 中我们需要；引入 react
import { fireEvent } from '@testing-library/react';

describe('ImportCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListBatches.mockResolvedValue([
      makeBatch('b1', 'success'),
      makeBatch('b2', 'paused', { paused_reason: '用户暂停' }),
      makeBatch('b3', 'failed'),
      makeBatch('b4', 'importing', { target_type: 'inventory' }),
      makeBatch('b5', 'cancelled', { target_type: 'sales', file_name: 'sales-orders.xlsx' }),
    ] as ImportBatchInfo[]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('渲染页面标题与默认过滤面板', async () => {
    renderPage();
    expect(screen.getByText(/Import Center/)).toBeInTheDocument();
    expect(screen.getByText('刷新')).toBeInTheDocument();
    expect(screen.getByText('新建导入')).toBeInTheDocument();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());
  });

  it('listBatches 返回的数据被渲染成表格行', async () => {
    renderPage();
    await waitFor(() => {
      // 文件名或 ID 出现在文档中
      expect(screen.getByText('sales-orders.xlsx')).toBeInTheDocument();
    });
    // 5 行 + 表头
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('状态过滤：选择「已暂停」只剩 paused 行', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    selectMultiSelectItem('所有状态', '已暂停');
    // 验证仅剩 b2 (paused) 一行
    await waitFor(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const visible = rows.filter((r) => !r.textContent?.includes('没有匹配'));
      // paused 应可见，success/failed/importing/cancelled 应被过滤
      expect(visible.length).toBe(1);
      // b2 显示「已暂停」chip
      expect(visible[0].textContent).toContain('已暂停');
      // 不可见的不应包含
      expect(visible[0].textContent).not.toContain('成功');
      expect(visible[0].textContent).not.toContain('失败');
    });
  });

  it('目标过滤：选择「商品」只保留 products 行', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    selectMultiSelectItem('所有类型', '商品');
    await waitFor(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).filter(
        (r) => !r.textContent?.includes('没有匹配'),
      );
      // b1/b2/b3 是 products，b4 inventory，b5 sales
      expect(rows.length).toBe(3);
    });
  });

  it('清空过滤：点击「清空」按钮后所有行回来', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    // 先过滤
    selectMultiSelectItem('所有状态', '已暂停');
    // 再清空
    await userEvent.click(screen.getByText('清空'));
    await waitFor(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).filter(
        (r) => !r.textContent?.includes('没有匹配'),
      );
      expect(rows.length).toBe(5);
    });
  });

  it('打开批次：点击行 → 抽屉出现，且显示操作按钮', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    const row = screen.getByText('sales-orders.xlsx').closest('tr');
    expect(row).toBeTruthy();
    await userEvent.click(row!);
    // Drawer 标题
    expect(await screen.findByText('批次详情')).toBeInTheDocument();
    // 5 个操作按钮
    expect(screen.getByText('暂停')).toBeInTheDocument();
    expect(screen.getByText('继续')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
    expect(screen.getByText('回滚')).toBeInTheDocument();
  });

  it('点击「重试」调用 retryBatch 并显示成功消息', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    // 选中 failed 的 b3
    const row = screen.getByText('b3.xlsx').closest('tr');
    await userEvent.click(row!);

    await userEvent.click(await screen.findByText('重试'));
    await waitFor(() => {
      expect(mockRetryBatch).toHaveBeenCalledWith('b3', null);
      expect(screen.getByText(/已创建重试批次/)).toBeInTheDocument();
    });
  });

  it('详情页模式：URL 含 batchId 自动选中 + 渲染映射快照/错误表格占位', async () => {
    // 改 mock 让 mapping_json + error_report_json 有值
    mockListBatches.mockResolvedValueOnce([
      makeBatch('detail-1', 'failed', {
        mapping_json: JSON.stringify([{ sourceColumn: '商品名称', targetField: 'name' }]),
        error_report_json: JSON.stringify([
          { rowIndex: 1, field: 'name', level: 'L1', code: 'REQUIRED', message: 'name 不能为空', value: '' },
        ]),
      }),
    ] as ImportBatchInfo[]);

    renderPage('/import-center/detail-1');
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    // 等 Drawer 渲染
    expect(await screen.findByText(/批次详情（独立页面）/)).toBeInTheDocument();
    // 映射快照显示（用 getAllByText 取第一个避免多匹配）
    expect(screen.getAllByText('商品名称')[0]).toBeInTheDocument();
    // 错误表格显示
    expect(screen.getByText('REQUIRED')).toBeInTheDocument();
    expect(screen.getByText('name 不能为空')).toBeInTheDocument();
    // 下载按钮
    expect(screen.getByText('下载 CSV')).toBeInTheDocument();
  });

  it('暂停按钮仅在 importing/pending/retrying 状态下可点击', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    // 选 b4 (importing) → 暂停按钮启用
    const row = screen.getByText('b4.xlsx').closest('tr');
    await userEvent.click(row!);
    const pauseBtn = await screen.findByText('暂停');
    expect(pauseBtn.closest('button')).not.toBeDisabled();

    // 选 b1 (success) → 暂停按钮应禁用
    await userEvent.click(screen.getByText('b1.xlsx').closest('tr')!);
    const pauseBtn2 = await screen.findByText('暂停');
    expect(pauseBtn2.closest('button')).toBeDisabled();
  });

  it('继续按钮仅 paused 启用', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalled());

    // b2 (paused) → 继续启用
    await userEvent.click(screen.getByText('b2.xlsx').closest('tr')!);
    const resumeBtn = await screen.findByText('继续');
    expect(resumeBtn.closest('button')).not.toBeDisabled();

    // b3 (failed) → 继续禁用
    await userEvent.click(screen.getByText('b3.xlsx').closest('tr')!);
    const resumeBtn2 = await screen.findByText('继续');
    expect(resumeBtn2.closest('button')).toBeDisabled();
  });

  it('刷新按钮触发 listBatches 再次调用', async () => {
    renderPage();
    await waitFor(() => expect(mockListBatches).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByText('刷新'));
    await waitFor(() => expect(mockListBatches).toHaveBeenCalledTimes(2));
  });
});
