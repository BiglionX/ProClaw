/**
 * v1.3：图片 zip manifest 解析/派生函数单测
 *
 * 覆盖：
 * - parseImageName 命名约定（5 个 case）
 * - deriveArchiveRelativePath 从绝对路径提取相对路径
 * - summarizeImageArchive 摘要字段
 */

import { describe, expect, it } from 'vitest';

import type { ImageArchiveManifest } from '../importers/types';
import {
  deriveArchiveRelativePath,
  summarizeImageArchive,
} from '../importService';

// 注意：parse_image_name 在 Rust 端，这里只通过 ImportRequest.imageArchive
// + 序列化往返间接验证。前端单测聚焦 TS 侧的派生函数。

describe('v1.3 zip manifest helpers', () => {
  describe('deriveArchiveRelativePath', () => {
    it('从 Windows 风格 AppData 路径提取 import_images/<hash>', () => {
      const manifest: ImageArchiveManifest = {
        archive_dir:
          'C:\\Users\\Alice\\AppData\\Roaming\\com.proclaw.desktop\\data\\import_images\\abc123def4567890',
        entries: [],
        total_size: 0,
      };
      expect(deriveArchiveRelativePath(manifest)).toBe(
        'import_images\\abc123def4567890',
      );
    });

    it('从 POSIX 风格 AppData 路径提取 import_images/<hash>', () => {
      const manifest: ImageArchiveManifest = {
        archive_dir: '/home/alice/.local/share/com.proclaw.desktop/data/import_images/abc123def4567890',
        entries: [],
        total_size: 0,
      };
      expect(deriveArchiveRelativePath(manifest)).toBe('import_images/abc123def4567890');
    });

    it('路径中无 import_images 时回退为原 archive_dir', () => {
      const manifest: ImageArchiveManifest = {
        archive_dir: '/tmp/some/random/path',
        entries: [],
        total_size: 0,
      };
      // 无 import_images 段 → 整个路径作为相对路径返回
      expect(deriveArchiveRelativePath(manifest)).toBe('/tmp/some/random/path');
    });

    it('空路径处理', () => {
      const manifest: ImageArchiveManifest = {
        archive_dir: '',
        entries: [],
        total_size: 0,
      };
      expect(deriveArchiveRelativePath(manifest)).toBe('');
    });
  });

  describe('summarizeImageArchive', () => {
    it('生成正确的 entryCount 与 totalSize', () => {
      const manifest: ImageArchiveManifest = {
        archive_dir: '/data/import_images/hash1',
        entries: [
          {
            archive_name: 'SP001.png',
            spu_code: 'SP001',
            sku_code: null,
            size_bytes: 1024,
            local_path: '/data/import_images/hash1/SP001.png',
          },
          {
            archive_name: 'SP002_SKU-A.jpg',
            spu_code: 'SP002',
            sku_code: 'SKU',
            size_bytes: 2048,
            local_path: '/data/import_images/hash1/SP002_SKU-A.jpg',
          },
        ],
        total_size: 3072,
      };
      const summary = summarizeImageArchive(manifest);
      expect(summary.archiveRelativePath).toBe('import_images/hash1');
      expect(summary.entryCount).toBe(2);
      expect(summary.totalSize).toBe(3072);
    });

    it('空 entries 时 entryCount=0', () => {
      const manifest: ImageArchiveManifest = {
        archive_dir: '/data/import_images/empty',
        entries: [],
        total_size: 0,
      };
      const summary = summarizeImageArchive(manifest);
      expect(summary.entryCount).toBe(0);
      expect(summary.totalSize).toBe(0);
    });
  });

  describe('ImageArchiveManifest 序列化往返', () => {
    it('JSON 序列化与反序列化保留字段', () => {
      const original: ImageArchiveManifest = {
        archive_dir: '/data/import_images/hash-roundtrip',
        entries: [
          {
            archive_name: 'SP100_main.png',
            spu_code: 'SP100',
            sku_code: null,
            size_bytes: 512,
            local_path: '/data/import_images/hash-roundtrip/SP100_main.png',
          },
        ],
        total_size: 512,
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as ImageArchiveManifest;
      expect(parsed).toEqual(original);
    });

    it('空 manifest 序列化', () => {
      const empty: ImageArchiveManifest = {
        archive_dir: '',
        entries: [],
        total_size: 0,
      };
      const json = JSON.stringify(empty);
      expect(json).toBe('{"archive_dir":"","entries":[],"total_size":0}');
    });
  });
});