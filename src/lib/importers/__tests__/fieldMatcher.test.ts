/**
 * fieldMatcher 单元测试
 * 覆盖：精确匹配、别名词典（中英文）、模糊匹配、未匹配、手动覆盖
 */

import { describe, expect, it } from 'vitest';

import { FIELD_ALIASES, matchColumn, matchColumns, manualMatch } from '../fieldMatcher';

describe('fieldMatcher', () => {
  describe('matchColumn - 精确与别名匹配', () => {
    it('英文字段名直接命中', () => {
      const m = matchColumn('name');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('name');
      expect(m!.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('中文字段名直接命中（name 别名）', () => {
      const m = matchColumn('商品名称');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('name');
      expect(m!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('中文别名：售价 → sell_price', () => {
      const m = matchColumn('售价');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('sell_price');
    });

    it('英文别名：price → sell_price', () => {
      const m = matchColumn('price');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('sell_price');
    });

    it('英文别名：cost → cost_price', () => {
      const m = matchColumn('cost');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('cost_price');
    });

    it('英文别名：stock → current_stock', () => {
      const m = matchColumn('stock');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('current_stock');
    });

    it('英文别名：barcode 命中', () => {
      const m = matchColumn('barcode');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('barcode');
    });

    it('中文别名：条形码 → barcode', () => {
      const m = matchColumn('条形码');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('barcode');
    });

    it('中文别名：分类 → category_name', () => {
      const m = matchColumn('分类');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('category_name');
    });

    it('中文别名：品牌 → brand_name', () => {
      const m = matchColumn('品牌');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('brand_name');
    });

    it('中文别名：图片URL → image_url', () => {
      const m = matchColumn('图片URL');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('image_url');
    });
  });

  describe('matchColumn - 模糊匹配', () => {
    it('拼写接近的英文（如 "ProductName"）', () => {
      const m = matchColumn('ProductName');
      expect(m).not.toBeNull();
      expect(m!.targetField).toBe('name');
      expect(m!.confidence).toBeGreaterThan(0.6);
    });

    it('拼写接近的中文（如 "商品名字"）', () => {
      const m = matchColumn('商品名字');
      expect(m).not.toBeNull();
      // 可能匹配到 name
      expect(m!.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('matchColumn - 未匹配', () => {
    it('完全无关的字符串', () => {
      const m = matchColumn('xyzqwerty');
      expect(m).toBeNull();
    });

    it('空字符串', () => {
      const m = matchColumn('');
      expect(m).toBeNull();
    });

    it('仅空白', () => {
      const m = matchColumn('   ');
      expect(m).toBeNull();
    });
  });

  describe('matchColumns - 批量', () => {
    it('标准商品表头批量匹配', () => {
      const headers = ['商品名称', '售价', '库存', '品牌', '分类', '条形码', '无关列'];
      const { matched, unmatched } = matchColumns(headers);
      expect(matched.size).toBeGreaterThanOrEqual(6);
      expect(matched.get('商品名称')?.targetField).toBe('name');
      expect(matched.get('售价')?.targetField).toBe('sell_price');
      expect(matched.get('库存')?.targetField).toBe('current_stock');
      expect(matched.get('品牌')?.targetField).toBe('brand_name');
      expect(matched.get('分类')?.targetField).toBe('category_name');
      expect(matched.get('条形码')?.targetField).toBe('barcode');
      expect(unmatched).toContain('无关列');
    });

    it('同目标字段多源列：只匹配最高置信度', () => {
      const headers = ['name', '商品名称', '品名'];
      const { matched } = matchColumns(headers);
      // 只应有一个被匹配到 name
      const nameMatches = Array.from(matched.values()).filter((m) => m.targetField === 'name');
      expect(nameMatches.length).toBe(1);
    });
  });

  describe('manualMatch', () => {
    it('手动匹配设置 confidence=1', () => {
      const m = manualMatch('我的字段', 'name');
      expect(m.confidence).toBe(1.0);
      expect(m.reason).toBe('manual');
    });
  });

  describe('FIELD_ALIASES 一致性', () => {
    it('所有目标字段都有非空别名数组', () => {
      for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
        expect(aliases.length, `${target} 缺少别名`).toBeGreaterThan(0);
      }
    });

    it('覆盖 PRD 规划的所有 MVP 字段', () => {
      const required = [
        'name', 'spu_code', 'description', 'category_name', 'brand_name', 'unit',
        'sku_code', 'spec_text', 'cost_price', 'sell_price', 'current_stock',
        'min_stock', 'max_stock', 'barcode', 'weight', 'volume', 'image_url',
      ];
      for (const r of required) {
        expect(FIELD_ALIASES[r], `${r} 缺失`).toBeDefined();
      }
    });
  });
});