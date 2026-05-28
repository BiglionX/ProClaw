#!/usr/bin/env node
/**
 * ProClaw 商品数据种子脚本
 * 用途：批量插入 20 个 iPhone 电池商品
 * 使用：node scripts/seed-products.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'src-tauri', 'databases', 'app.db');
const sqlPath = path.join(__dirname, '..', 'database', 'seed_iphone_batteries.sql');

console.log('============================================');
console.log('ProClaw 商品数据种子脚本');
console.log('============================================');
console.log('');

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在:', dbPath);
  console.log('请先运行应用以初始化数据库');
  process.exit(1);
}

// 检查 SQL 文件是否存在
if (!fs.existsSync(sqlPath)) {
  console.error('❌ SQL 文件不存在:', sqlPath);
  process.exit(1);
}

console.log('📂 数据库路径:', dbPath);
console.log('📄 SQL 文件路径:', sqlPath);
console.log('');

// 连接数据库
console.log('🔌 连接数据库...');
const db = new Database(dbPath);

try {
  // 读取 SQL 文件
  console.log('📖 读取 SQL 文件...');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // 分割 SQL 语句（简单分割，忽略注释）
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📊 找到 ${statements.length} 条 SQL 语句`);
  console.log('');
  
  // 开始事务
  console.log('🚀 开始插入数据...');
  console.log('');
  
  const result = db.transaction(() => {
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      
      // 跳过非 INSERT 语句（如 SELECT 验证语句）
      if (!stmt.toUpperCase().startsWith('INSERT')) {
        continue;
      }
      
      try {
        db.exec(stmt);
        successCount++;
        
        // 显示进度
        if (stmt.includes('product_spus')) {
          console.log(`  ✅ [${i + 1}/${statements.length}] 插入 SPU 数据`);
        } else if (stmt.includes('product_skus')) {
          console.log(`  ✅ [${i + 1}/${statements.length}] 插入 SKU 数据`);
        } else if (stmt.includes('product_images')) {
          console.log(`  ✅ [${i + 1}/${statements.length}] 插入图片数据`);
        } else if (stmt.includes('product_categories')) {
          console.log(`  ✅ [${i + 1}/${statements.length}] 插入分类数据`);
        } else if (stmt.includes('brands')) {
          console.log(`  ✅ [${i + 1}/${statements.length}] 插入品牌数据`);
        }
      } catch (err) {
        // 忽略重复键错误
        if (err.message.includes('UNIQUE constraint failed')) {
          skipCount++;
          console.log(`  ⚠️  [${i + 1}/${statements.length}] 跳过（已存在）`);
        } else {
          throw err;
        }
      }
    }
    
    return { successCount, skipCount };
  })();
  
  console.log('');
  console.log('============================================');
  console.log('✅ 数据插入完成！');
  console.log('============================================');
  console.log(`成功插入: ${result.successCount} 条`);
  console.log(`跳过重复: ${result.skipCount} 条`);
  console.log('');
  
  // 验证数据
  console.log('📊 验证数据...');
  const spuCount = db.prepare('SELECT COUNT(*) as count FROM product_spus WHERE id LIKE ?').get('spu_iphone%');
  const skuCount = db.prepare('SELECT COUNT(*) as count FROM product_skus WHERE spu_id LIKE ?').get('spu_iphone%');
  const imgCount = db.prepare('SELECT COUNT(*) as count FROM product_images WHERE spu_id LIKE ?').get('spu_iphone%');
  
  console.log(`  SPU 数量: ${spuCount.count}`);
  console.log(`  SKU 数量: ${skuCount.count}`);
  console.log(`  图片数量: ${imgCount.count}`);
  console.log('');
  
  // 显示插入的商品
  console.log('📦 已插入的商品：');
  console.log('--------------------------------------------');
  const products = db.prepare(`
    SELECT 
      spu.spu_code,
      spu.name,
      sku.sell_price,
      sku.current_stock
    FROM product_spus spu
    LEFT JOIN product_skus sku ON spu.id = sku.spu_id
    WHERE spu.id LIKE ?
    ORDER BY spu.spu_code
  `).all('spu_iphone%');
  
  products.forEach((p, idx) => {
    console.log(`${String(idx + 1).padStart(2, ' ')}. ${p.spu_code} | ${p.name} | ¥${p.sell_price} | 库存:${p.current_stock}`);
  });
  
  console.log('');
  console.log('============================================');
  console.log('🎉 完成！现在可以在应用中查看这些商品了');
  console.log('============================================');
  
} catch (err) {
  console.error('');
  console.error('❌ 错误:', err.message);
  console.error('');
  throw err;
} finally {
  db.close();
}
