/**
 * ProClaw 批量导入中心 - 服务层单元测试（v1.2 P1）
 *
 * 覆盖 importService 中 13 个 Tauri 命令封装、fileToBase64、downloadTextFile、importAvailable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  createBatch,
  reparseBatch,
  validateBatch,
  executeBatch,
  pauseBatch,
  cancelBatch,
  retryBatch,
  getBatch,
  listBatches,
  getBatchErrors,
  getTemplates,
  listMappingTemplates,
  saveMappingTemplate,
  fileToBase64,
  downloadTextFile,
  importAvailable,
} from './importService';

vi.mock('@tauri-apps/api/core');

describe('importService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // fileToBase64
  // ============================================
  describe('fileToBase64', () => {
    it('应该把 File 转为去前缀的 base64', async () => {
      const mockFile = new File(['hello'], 'test.csv', { type: 'text/csv' });
      // 直接 mock FileReader
      const originalFileReader = globalThis.FileReader;
      class MockFileReader {
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        public result: string | ArrayBuffer | null = 'data:text/csv;base64,aGVsbG8=';
        readAsDataURL() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

      try {
        const result = await fileToBase64(mockFile);
        expect(result).toBe('aGVsbG8=');
      } finally {
        globalThis.FileReader = originalFileReader;
      }
    });

    it('应该在读取失败时抛出错误', async () => {
      const mockFile = new File(['x'], 'x.csv');
      const originalFileReader = globalThis.FileReader;
      class MockFileReader {
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        readAsDataURL() {
          setTimeout(() => this.onerror?.(), 0);
        }
      }
      globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

      try {
        await expect(fileToBase64(mockFile)).rejects.toThrow('文件读取失败');
      } finally {
        globalThis.FileReader = originalFileReader;
      }
    });
  });

  // ============================================
  // createBatch
  // ============================================
  describe('createBatch', () => {
    it('应该把 CSV 文件以 base64 上传并调用 import_create_batch', async () => {
      const mockFile = new File(['sku,name\nSKU-1,Test'], 'products.csv', {
        type: 'text/csv',
      });
      const mockResp = {
        batch_id: 'b1',
        target_type: 'products' as const,
        target_label: '商品库',
        total_rows: 1,
        headers: ['sku', 'name'],
        sample_rows: [{ sku: 'SKU-1', name: 'Test' }],
      };

      // 直接 mock invoke
      (invoke as any).mockResolvedValue(mockResp);

      const resp = await createBatch('products', mockFile);
      expect(resp.batch_id).toBe('b1');
      expect(invoke).toHaveBeenCalledWith(
        'import_create_batch',
        expect.objectContaining({
          request: expect.objectContaining({
            target_type: 'products',
            source_filename: 'products.csv',
            source_format: 'csv',
            source_base64: expect.any(String),
          }),
        }),
      );
    });

    it('应该根据 .json 后缀识别格式为 json', async () => {
      const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });
      (invoke as any).mockResolvedValue({
        batch_id: 'b1',
        target_type: 'products',
        target_label: '商品库',
        total_rows: 0,
        headers: [],
        sample_rows: [],
      });

      await createBatch('products', mockFile);

      expect(invoke).toHaveBeenCalledWith(
        'import_create_batch',
        expect.objectContaining({
          request: expect.objectContaining({ source_format: 'json' }),
        }),
      );
    });

    it('应该根据 .xlsx 后缀识别格式为 xlsx', async () => {
      const mockFile = new File(['x'], 'data.xlsx');
      (invoke as any).mockResolvedValue({
        batch_id: 'b1',
        target_type: 'products',
        target_label: '商品库',
        total_rows: 0,
        headers: [],
        sample_rows: [],
      });

      await createBatch('products', mockFile);

      expect(invoke).toHaveBeenCalledWith(
        'import_create_batch',
        expect.objectContaining({
          request: expect.objectContaining({ source_format: 'xlsx' }),
        }),
      );
    });

    it('应该正确传递 performed_by / notes 选项', async () => {
      const mockFile = new File(['x'], 'data.csv');
      (invoke as any).mockResolvedValue({
        batch_id: 'b1',
        target_type: 'products',
        target_label: '商品库',
        total_rows: 0,
        headers: [],
        sample_rows: [],
      });

      await createBatch('products', mockFile, {
        performed_by: 'alice',
        notes: '季度导入',
      });

      expect(invoke).toHaveBeenCalledWith(
        'import_create_batch',
        expect.objectContaining({
          request: expect.objectContaining({
            performed_by: 'alice',
            notes: '季度导入',
          }),
        }),
      );
    });
  });

  // ============================================
  // reparseBatch
  // ============================================
  describe('reparseBatch', () => {
    it('应该调用 import_parse_file', async () => {
      (invoke as any).mockResolvedValue({
        batch_id: 'b1',
        target_type: 'products',
        target_label: '商品库',
        total_rows: 5,
        headers: ['sku'],
        sample_rows: [],
      });

      await reparseBatch('b1');
      expect(invoke).toHaveBeenCalledWith('import_parse_file', { batchId: 'b1' });
    });
  });

  // ============================================
  // validateBatch
  // ============================================
  describe('validateBatch', () => {
    it('应该调用 import_validate_batch 并传递 mapping', async () => {
      const mockResp = {
        batch_id: 'b1',
        status: 'mapping' as const,
        valid_rows: 5,
        invalid_rows: 0,
        error_count: 0,
      };
      (invoke as any).mockResolvedValue(mockResp);

      const result = await validateBatch({
        batch_id: 'b1',
        column_mapping: { SKU: 'sku', 名称: 'name' },
      });

      expect(result.valid_rows).toBe(5);
      expect(invoke).toHaveBeenCalledWith('import_validate_batch', {
        request: {
          batch_id: 'b1',
          column_mapping: { SKU: 'sku', 名称: 'name' },
          default_values: undefined,
        },
      });
    });
  });

  // ============================================
  // executeBatch
  // ============================================
  describe('executeBatch', () => {
    it('应该默认 skip_errors=true', async () => {
      (invoke as any).mockResolvedValue({
        batch_id: 'b1',
        status: 'success' as const,
        processed_rows: 5,
        success_rows: 5,
        failed_rows: 0,
        skipped_rows: 0,
        finished_at: '2026-07-01T00:00:00Z',
      });

      await executeBatch({ batch_id: 'b1', column_mapping: { SKU: 'sku' } });

      expect(invoke).toHaveBeenCalledWith(
        'import_execute_batch',
        expect.objectContaining({
          request: expect.objectContaining({ skip_errors: true }),
        }),
      );
    });

    it('应该尊重用户传入的 skip_errors=false', async () => {
      (invoke as any).mockResolvedValue({});

      await executeBatch({
        batch_id: 'b1',
        column_mapping: {},
        skip_errors: false,
      });

      expect(invoke).toHaveBeenCalledWith(
        'import_execute_batch',
        expect.objectContaining({
          request: expect.objectContaining({ skip_errors: false }),
        }),
      );
    });
  });

  // ============================================
  // 批次控制
  // ============================================
  describe('批次控制', () => {
    it('pauseBatch 应该调用 import_pause_batch', async () => {
      (invoke as any).mockResolvedValue(undefined);
      await pauseBatch('b1');
      expect(invoke).toHaveBeenCalledWith('import_pause_batch', { batchId: 'b1' });
    });

    it('cancelBatch 应该调用 import_cancel_batch', async () => {
      (invoke as any).mockResolvedValue(undefined);
      await cancelBatch('b1');
      expect(invoke).toHaveBeenCalledWith('import_cancel_batch', { batchId: 'b1' });
    });

    it('retryBatch 应该调用 import_retry_batch', async () => {
      (invoke as any).mockResolvedValue({
        batch_id: 'b1',
        status: 'success' as const,
        processed_rows: 0,
        success_rows: 0,
        failed_rows: 0,
        skipped_rows: 0,
        finished_at: '',
      });
      await retryBatch('b1');
      expect(invoke).toHaveBeenCalledWith('import_retry_batch', { batchId: 'b1' });
    });
  });

  // ============================================
  // 查询
  // ============================================
  describe('查询接口', () => {
    it('getBatch 应该调用 import_get_batch', async () => {
      (invoke as any).mockResolvedValue({
        id: 'b1',
        target_type: 'products',
        source_filename: 'x.csv',
        source_format: 'csv',
        status: 'success',
        processed_rows: 0,
        success_rows: 0,
        failed_rows: 0,
        skipped_rows: 0,
      });
      await getBatch('b1');
      expect(invoke).toHaveBeenCalledWith('import_get_batch', { batchId: 'b1' });
    });

    it('listBatches 应该应用默认值 limit=50 / offset=0', async () => {
      (invoke as any).mockResolvedValue([]);
      await listBatches();
      expect(invoke).toHaveBeenCalledWith('import_list_batches', {
        request: {
          target_type: null,
          status: null,
          limit: 50,
          offset: 0,
        },
      });
    });

    it('listBatches 应该尊重自定义 limit / offset', async () => {
      (invoke as any).mockResolvedValue([]);
      await listBatches({ target_type: 'products', limit: 10, offset: 20 });
      expect(invoke).toHaveBeenCalledWith('import_list_batches', {
        request: {
          target_type: 'products',
          status: null,
          limit: 10,
          offset: 20,
        },
      });
    });

    it('getBatchErrors 应该默认 limit=200', async () => {
      (invoke as any).mockResolvedValue([]);
      await getBatchErrors('b1');
      expect(invoke).toHaveBeenCalledWith('import_get_batch_errors', {
        batchId: 'b1',
        limit: 200,
        offset: 0,
      });
    });
  });

  // ============================================
  // 模板
  // ============================================
  describe('模板接口', () => {
    it('getTemplates 应该调用 import_get_templates', async () => {
      (invoke as any).mockResolvedValue([]);
      await getTemplates();
      expect(invoke).toHaveBeenCalledWith('import_get_templates');
    });

    it('listMappingTemplates 无参时 target_type=null', async () => {
      (invoke as any).mockResolvedValue([]);
      await listMappingTemplates();
      expect(invoke).toHaveBeenCalledWith('import_list_mapping_templates', {
        request: { target_type: null },
      });
    });

    it('listMappingTemplates 传 target 时透传', async () => {
      (invoke as any).mockResolvedValue([]);
      await listMappingTemplates('products');
      expect(invoke).toHaveBeenCalledWith('import_list_mapping_templates', {
        request: { target_type: 'products' },
      });
    });

    it('saveMappingTemplate 应该把 mapping + config 传给后端', async () => {
      (invoke as any).mockResolvedValue({
        id: 't1',
        target_type: 'products',
        template_name: '默认映射',
        mapping: { SKU: 'sku' },
        use_count: 0,
      });

      await saveMappingTemplate({
        target_type: 'products',
        template_name: '默认映射',
        mapping: { SKU: 'sku' },
        config: { source: 'csv' },
      });

      expect(invoke).toHaveBeenCalledWith('import_save_mapping_template', {
        request: {
          target_type: 'products',
          template_name: '默认映射',
          mapping: { SKU: 'sku' },
          config: { source: 'csv' },
        },
      });
    });
  });

  // ============================================
  // downloadTextFile
  // ============================================
  describe('downloadTextFile', () => {
    it('应该创建 a 标签并触发点击下载', () => {
      // spy on HTMLAnchorElement.click 但保留真实 DOM 节点
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      // mock URL.createObjectURL / revokeObjectURL
      const createObjUrl = vi.fn(() => 'blob:mock');
      const revokeObjUrl = vi.fn();
      const origCreate = URL.createObjectURL;
      const origRevoke = URL.revokeObjectURL;
      URL.createObjectURL = createObjUrl;
      URL.revokeObjectURL = revokeObjUrl;

      try {
        downloadTextFile('products.csv', 'sku,name\nSKU-1,Test');
        expect(createObjUrl).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
      } finally {
        clickSpy.mockRestore();
        URL.createObjectURL = origCreate;
        URL.revokeObjectURL = origRevoke;
      }
    });
  });

  // ============================================
  // importAvailable
  // ============================================
  describe('importAvailable', () => {
    it('应该在 Tauri 环境中返回 true', () => {
      // setup.ts 已经把 isTauri mock 为 true
      expect(importAvailable()).toBe(true);
    });
  });
});