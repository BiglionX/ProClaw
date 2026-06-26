#!/usr/bin/env node
/**
 * v1.3 C2：构建 5 套导入模板（xlsx） + examples.zip
 *
 * 输出：
 *   - public/templates/products-template.xlsx
 *   - public/templates/inventory-template.xlsx
 *   - public/templates/purchases-template.xlsx
 *   - public/templates/sales-template.xlsx
 *   - public/templates/suppliers-customers-template.xlsx
 *   - public/templates/examples.zip  （上述 5 个模板 + 10 张占位图）
 *
 * 用法：
 *   node scripts/build-import-templates.mjs
 *
 * 模板字段命名与 src-tauri/src/import/types.rs 的 REQUIRED_*_FIELDS / KNOWN_FIELDS_* 保持一致。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "templates");
fs.mkdirSync(outDir, { recursive: true });

// ==================== 模板字段定义 ====================

const PRODUCTS_HEADERS = [
  // 必填字段（★ 表示后端 REQUIRED_PRODUCT_FIELDS）
  "spu_code",          // ★
  "name",              // ★
  "category",          // ★
  // 选填字段
  "sku_code",
  "brand",
  "model",
  "barcode",
  "unit",
  "cost_price",
  "sale_price",
  "market_price",
  "weight",
  "volume",
  "description",
  "image_filename",    // v1.3 A3：与 images.zip 内文件名对应
  "attributes_json",   // 颜色/尺码等扩展属性（JSON 字符串）
  "supplier_code",
  "min_stock",
  "max_stock",
  "safety_stock",
  "lead_time_days",
  "shelf_life_days",
  "hs_code",
  "country_of_origin",
  "tax_category",
  "sync_status",
  "is_active",
  "notes",
];

const INVENTORY_HEADERS = [
  "sku_code",          // ★
  "transaction_type",  // ★ 入库/出库/调拨/盘点
  "quantity",          // ★
  "transaction_date",  // ★
  "unit_cost",
  "location_code",
  "reference_no",
  "supplier_code",
  "notes",
];

const PURCHASES_HEADERS = [
  "order_no",          // ★
  "supplier_name",     // ★
  "ordered_at",        // ★
  "expected_at",
  "status",
  "total_amount",
  "items_json",        // [{sku_code, quantity, unit_cost}, ...]
  "notes",
];

const SALES_HEADERS = [
  "order_no",          // ★
  "customer_name",     // ★
  "ordered_at",        // ★
  "status",
  "total_amount",
  "payment_method",
  "items_json",        // [{sku_code, quantity, unit_price, discount}, ...]
  "notes",
];

const SUPPLIERS_HEADERS = [
  "supplier_code",     // ★
  "name",              // ★
  "contact_person",
  "phone",
  "email",
  "address",
  "tax_id",
  "payment_terms",
  "is_active",
  "notes",
];

const CUSTOMERS_HEADERS = [
  "customer_code",     // ★
  "name",              // ★
  "contact_person",
  "phone",
  "email",
  "address",
  "tax_id",
  "customer_type",     // 个人/企业
  "credit_limit",
  "is_active",
  "notes",
];

// ==================== 辅助函数 ====================

/** 写一个 xlsx：第 1 行表头 + 1 行示例 + 注释（A2 单元格） */
function writeTemplate(filePath, headers, sampleRow, comment) {
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    sampleRow,
  ]);
  // 冻结首行
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  // 设置列宽（粗略）
  sheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }));

  // 注入说明（A3 单元格）
  if (comment) {
    XLSX.utils.sheet_add_aoa(sheet, [[comment]], { origin: { r: 2, c: 0 } });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
  XLSX.writeFile(wb, filePath);
  const size = fs.statSync(filePath).size;
  console.log(`  ✓ ${path.basename(filePath)}  (${size} bytes, ${headers.length} 列)`);
  return size;
}

/** 写双 sheet xlsx（suppliers-customers 用） */
function writeDualSheetTemplate(filePath, sheet1, sheet2, comment) {
  const wb = XLSX.utils.book_new();

  // Sheet 1
  const ws1 = XLSX.utils.aoa_to_sheet([sheet1.headers, sheet1.sample]);
  ws1["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws1["!cols"] = sheet1.headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
  if (comment) {
    XLSX.utils.sheet_add_aoa(ws1, [[comment]], { origin: { r: 2, c: 0 } });
  }
  XLSX.utils.book_append_sheet(wb, ws1, "suppliers");

  // Sheet 2
  const ws2 = XLSX.utils.aoa_to_sheet([sheet2.headers, sheet2.sample]);
  ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws2["!cols"] = sheet2.headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
  XLSX.utils.book_append_sheet(wb, ws2, "customers");

  XLSX.writeFile(wb, filePath);
  const size = fs.statSync(filePath).size;
  console.log(`  ✓ ${path.basename(filePath)}  (${size} bytes, 双 sheet: ${sheet1.headers.length}+${sheet2.headers.length} 列)`);
  return size;
}

// ==================== 5 套模板 ====================

console.log(`\n[v1.3 C2] 生成导入模板 → ${outDir}\n`);

// 1. products
const productsSample = [
  "SPU-0001", "示例商品名称", "默认分类",
  "SKU-0001-01", "示例品牌", "MD-2024", "6901234567890", "件",
  "10.00", "19.90", "29.90", "0.5", "0.001",
  "商品描述", "SPU-0001_main.png", '{"color":"red"}',
  "SUP-001", "10", "100", "20", "7", "365",
  "8517.12.00", "CN", "标准税率", "local", "1", "示例备注",
];
writeTemplate(
  path.join(outDir, "products-template.xlsx"),
  PRODUCTS_HEADERS,
  productsSample,
  "★ 必填：spu_code / name / category。  image_filename 与 images.zip 内文件名一一对应。"
);

// 2. inventory
const inventorySample = [
  "SKU-0001-01", "入库", "100", "2026-06-26", "10.00",
  "WH-A-01", "PO-202606-0001", "SUP-001", "示例入库",
];
writeTemplate(
  path.join(outDir, "inventory-template.xlsx"),
  INVENTORY_HEADERS,
  inventorySample,
  "★ 必填：sku_code / transaction_type / quantity / transaction_date。"
);

// 3. purchases
const purchasesSample = [
  "PO-202606-0001", "示例供应商", "2026-06-26", "2026-07-03",
  "draft", "1990.00", '[{"sku_code":"SKU-0001-01","quantity":100,"unit_cost":10.00}]',
  "示例采购单",
];
writeTemplate(
  path.join(outDir, "purchases-template.xlsx"),
  PURCHASES_HEADERS,
  purchasesSample,
  "★ 必填：order_no / supplier_name / ordered_at。  items_json 为 JSON 字符串。"
);

// 4. sales
const salesSample = [
  "SO-202606-0001", "示例客户", "2026-06-26",
  "draft", "1990.00", "现金",
  '[{"sku_code":"SKU-0001-01","quantity":1,"unit_price":19.90,"discount":0}]',
  "示例销售单",
];
writeTemplate(
  path.join(outDir, "sales-template.xlsx"),
  SALES_HEADERS,
  salesSample,
  "★ 必填：order_no / customer_name / ordered_at。  items_json 为 JSON 字符串。"
);

// 5. suppliers-customers（双 sheet）
const suppliersSheet = {
  headers: SUPPLIERS_HEADERS,
  sample: [
    "SUP-001", "示例供应商公司", "张三", "13800000001",
    "supplier@example.com", "广东省深圳市南山区", "91440300MA000000XX",
    "月结30天", "1", "示例供应商备注",
  ],
};
const customersSheet = {
  headers: CUSTOMERS_HEADERS,
  sample: [
    "CUS-001", "示例客户公司", "李四", "13900000001",
    "customer@example.com", "北京市朝阳区", "91110105MA000000YY",
    "企业", "10000.00", "1", "示例客户备注",
  ],
};
writeDualSheetTemplate(
  path.join(outDir, "suppliers-customers-template.xlsx"),
  suppliersSheet,
  customersSheet,
  "★ suppliers / customers 双 sheet 各 10 列，必填首列 code + name。"
);

// ==================== examples.zip ====================

console.log("\n[v1.3 C2] 打包 examples.zip（含 5 套模板 + 10 张占位图）\n");
const zip = new JSZip();
const templates = [
  "products-template.xlsx",
  "inventory-template.xlsx",
  "purchases-template.xlsx",
  "sales-template.xlsx",
  "suppliers-customers-template.xlsx",
];
for (const t of templates) {
  const buf = fs.readFileSync(path.join(outDir, t));
  zip.file(t, buf);
}

// 10 张占位示例图：1x1 透明 PNG（最小可显示）
// 67 字节的 1x1 透明 PNG（libpng 标头）
const TINY_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // 签名
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, // IDAT
  0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05,
  0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND
  0xae, 0x42, 0x60, 0x82,
]);

const sampleImages = [
  "SPU-0001_main.png", "SPU-0001_side.png",
  "SPU-0002_main.png", "SPU-0002_side.png",
  "SPU-0003_main.png", "SPU-0003_side.png",
  "SPU-0004_main.png", "SPU-0004_side.png",
  "SPU-0005_main.png", "SPU-0005_side.png",
];
for (const img of sampleImages) {
  zip.file(`images/${img}`, TINY_PNG);
}

// README.txt 帮助用户理解 zip 内结构
const readme = `ProClaw 导入示例包（v1.3 C2）
===================================

目录结构：
  products-template.xlsx             商品导入模板（28 列）
  inventory-template.xlsx            库存交易模板（9 列）
  purchases-template.xlsx            采购订单模板（8 列）
  sales-template.xlsx                销售订单模板（8 列）
  suppliers-customers-template.xlsx  主数据模板（双 sheet）
  images/                            10 张示例图（与 products 模板的 image_filename 字段对应）

使用步骤：
  1. 打开 Step1 文件选择向导 → 选择对应模板填数据
  2. 如导入商品，可同时上传本 zip 作为图片源
  3. 后端 import_extract_images 会自动按 image_filename 字段匹配

图片文件名校约定：
  - 单一图片：  <SPU编码>_main.png
  - 多图：      <SPU编码>_<任意描述>.png
  - SKU 维度：  <SKU编码>_<x>.png
`;
zip.file("README.txt", readme);

const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
const zipPath = path.join(outDir, "examples.zip");
fs.writeFileSync(zipPath, zipBuf);
console.log(`  ✓ examples.zip  (${zipBuf.length} bytes, 5 模板 + 10 图片 + README)`);

console.log(`\n[v1.3 C2] ✅ 完成。共生成 6 个文件。\n`);
