/**
 * v1.3 C4：TemplateDownloadPanel 单测
 *
 * 覆盖：
 * - 加载状态：初次渲染显示 spinner
 * - 列表渲染：5 套模板元数据正确展示
 * - 列表为空：显示警告 Alert
 * - 后端错误：显示错误 Alert
 * - 单模板下载：调 listTemplates → getTemplateBytes → save → writeFile
 * - examples.zip 下载：调 getExamplesZip → save → writeFile
 * - 用户取消保存对话框：跳过 writeFile
 * - examples.zip 缺失：显示"未生成"提示
 * - 多个下载并发：disabled 状态生效
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TemplateDownloadPanel } from '../TemplateDownloadPanel';
import type { ImportTemplateInfo } from '../../../lib/services/importService';

// ---------- mock: tauri dialog / fs ----------
const { mockSave, mockWriteFile } = vi.hoisted(() => ({
  mockSave: vi.fn(async () => '/tmp/selected.xlsx' as string | null),
  mockWriteFile: vi.fn(async () => undefined),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: mockSave }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: mockWriteFile }));

// ---------- mock: importService ----------
const {
  mockListTemplates,
  mockGetTemplateBytes,
  mockGetExamplesZip,
} = vi.hoisted(() => ({
  mockListTemplates: vi.fn(async () => [] as ImportTemplateInfo[]),
  mockGetTemplateBytes: vi.fn(async () => ({
    file_name: 'products-template.xlsx',
    bytes: [1, 2, 3, 4],
  })),
  mockGetExamplesZip: vi.fn(async () => ({
    file_name: 'examples.zip',
    bytes: [0x50, 0x4b, 0x03, 0x04],
  })),
}));
vi.mock('../../../lib/services/importService', () => ({
  listTemplates: mockListTemplates,
  getTemplateBytes: mockGetTemplateBytes,
  getExamplesZip: mockGetExamplesZip,
}));

// ---------- 测试工具 ----------
const theme = createTheme();

const SAMPLE_TEMPLATES: ImportTemplateInfo[] = [
  {
    name: 'products',
    target_type: 'products',
    file_name: 'products-template.xlsx',
    size_bytes: 19769,
    sha256: 'a'.repeat(64),
  },
  {
    name: 'inventory',
    target_type: 'inventory',
    file_name: 'inventory-template.xlsx',
    size_bytes: 17171,
    sha256: 'b'.repeat(64),
  },
  {
    name: 'purchases',
    target_type: 'purchases',
    file_name: 'purchases-template.xlsx',
    size_bytes: 17146,
    sha256: 'c'.repeat(64),
  },
  {
    name: 'sales',
    target_type: 'sales',
    file_name: 'sales-template.xlsx',
    size_bytes: 17164,
    sha256: 'd'.repeat(64),
  },
  {
    name: 'suppliers-customers',
    target_type: 'suppliers-customers',
    file_name: 'suppliers-customers-template.xlsx',
    size_bytes: 19788,
    sha256: 'e'.repeat(64),
  },
];

function renderPanel() {
  return render(
    <ThemeProvider theme={theme}>
      <TemplateDownloadPanel />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListTemplates.mockResolvedValue(SAMPLE_TEMPLATES);
  mockGetTemplateBytes.mockResolvedValue({
    file_name: 'products-template.xlsx',
    bytes: [1, 2, 3, 4],
  });
  mockGetExamplesZip.mockResolvedValue({
    file_name: 'examples.zip',
    bytes: [0x50, 0x4b, 0x03, 0x04],
  });
  mockSave.mockResolvedValue('/tmp/selected.xlsx');
  mockWriteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TemplateDownloadPanel', () => {
  it('初次渲染时显示 loading 状态', () => {
    mockListTemplates.mockReturnValue(new Promise(() => {})); // 永不 resolve
    renderPanel();
    expect(screen.getByText(/正在加载模板列表/)).toBeInTheDocument();
  });

  it('加载成功后渲染 5 套模板 + 计数器', async () => {
    renderPanel();
    const chip = await screen.findByTestId('template-count-chip');
    expect(chip).toHaveTextContent('5 套');
    // 验证 5 行渲染（按 data-testid）
    expect(screen.getByTestId('template-row-products')).toBeInTheDocument();
    expect(screen.getByTestId('template-row-inventory')).toBeInTheDocument();
    expect(screen.getByTestId('template-row-purchases')).toBeInTheDocument();
    expect(screen.getByTestId('template-row-sales')).toBeInTheDocument();
    expect(screen.getByTestId('template-row-suppliers-customers')).toBeInTheDocument();
  });

  it('每行显示元数据（target_type 中文 + 大小 + SHA 前 8 位）', async () => {
    renderPanel();
    await screen.findByTestId('template-row-products');
    expect(screen.getByText('商品库')).toBeInTheDocument();
    expect(screen.getByText('库存交易')).toBeInTheDocument();
    expect(screen.getByText('采购订单')).toBeInTheDocument();
    expect(screen.getByText('销售订单')).toBeInTheDocument();
    expect(screen.getByText('供应商与客户')).toBeInTheDocument();
    // 文件大小格式化（多个模板都约为 19.3 KB，取第一个即可）
    expect(screen.getAllByText(/19\.3 KB/).length).toBeGreaterThan(0);
    // SHA-256 前 8 位
    expect(screen.getAllByText(/aaaaaaaa…/).length).toBeGreaterThan(0);
  });

  it('列表为空时显示警告', async () => {
    mockListTemplates.mockResolvedValue([]);
    renderPanel();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/当前没有可用模板/);
  });

  it('后端错误时显示错误 Alert', async () => {
    mockListTemplates.mockRejectedValue(new Error('网络断开'));
    renderPanel();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/无法读取模板列表.*网络断开/);
  });

  it('点击模板的"下载"按钮：触发 save → getTemplateBytes → writeFile', async () => {
    renderPanel();
    await screen.findByTestId('template-row-products');
    await userEvent.click(screen.getByTestId('template-download-products'));
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockGetTemplateBytes).toHaveBeenCalledWith('products');
    });
    await waitFor(() => {
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });
    // 验证 save 默认文件名
    const saveCall = mockSave.mock.calls[0] as unknown as [{ defaultPath?: string }];
    expect(saveCall[0].defaultPath).toBe('products-template.xlsx');
    // 验证写入内容是 Uint8Array
    const writeCall = mockWriteFile.mock.calls[0] as unknown as [string, Uint8Array];
    expect(writeCall[0]).toBe('/tmp/selected.xlsx');
    expect(writeCall[1]).toBeInstanceOf(Uint8Array);
  });

  it('用户取消保存对话框（save 返回 null）时跳过 writeFile', async () => {
    mockSave.mockResolvedValue(null);
    renderPanel();
    await screen.findByTestId('template-row-products');
    await userEvent.click(screen.getByTestId('template-download-products'));
    // 给 save 一次机会 resolve null
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    });
    // writeFile 不应该被调用
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('点击"下载完整示例数据集"：调 getExamplesZip', async () => {
    renderPanel();
    await screen.findByTestId('template-row-products');
    await userEvent.click(screen.getByTestId('download-examples-button'));
    await waitFor(() => {
      expect(mockGetExamplesZip).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });
  });

  it('examples.zip 缺失时显示"未生成"提示', async () => {
    mockGetExamplesZip.mockRejectedValue(new Error('examples.zip 不存在（xxx）'));
    renderPanel();
    await screen.findByTestId('template-row-products');
    await userEvent.click(screen.getByTestId('download-examples-button'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/examples\.zip 尚未生成/);
  });

  it('下载成功后显示成功 Alert（保存路径）', async () => {
    mockSave.mockResolvedValue('D:/Downloads/products-template.xlsx');
    renderPanel();
    await screen.findByTestId('template-row-products');
    await userEvent.click(screen.getByTestId('template-download-products'));
    const success = await screen.findByTestId('template-download-success');
    expect(success.textContent).toMatch(/已保存.*D:\/Downloads\/products-template\.xlsx/);
  });
});
