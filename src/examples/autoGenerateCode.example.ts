/**
 * 商品编号自动生成 - 使用示例
 * 
 * 此文件展示如何使用自动生成功能创建商品
 */

import { 
  createProductSPU, 
  generateSPUCode,
  generateSKUCode,
  generateSpecText 
} from '../lib/productService';

// ============================================
// 示例1: 完全自动生成(最简单)
// ============================================
async function example1_FullAutoGenerate() {
  console.log('=== 示例1: 完全自动生成 ===');
  
  try {
    const result = await createProductSPU(
      {
        // 不提供 spu_code,系统自动生成
        name: '测试商品-全自动',
        subtitle: '系统自动编码',
        description: '这是一个测试商品,所有编码由系统自动生成',
        unit: '件',
        is_on_sale: true,
      },
      [
        {
          // 不提供 sku_code,系统自动生成
          specifications: { '颜色': '红色', '尺寸': 'M' },
          // 不提供 spec_text,系统自动生成 "红色/M"
          cost_price: 50,
          sell_price: 99,
          current_stock: 100,
        },
        {
          specifications: { '颜色': '蓝色', '尺寸': 'L' },
          cost_price: 50,
          sell_price: 99,
          current_stock: 80,
        },
      ],
      [] // 暂不上传图片
    );
    
    console.log('✅ 创建成功!');
    console.log('SPU Code:', result.spu_code);
    console.log('SKU Codes:', result.skus?.map(s => s.sku_code));
    console.log('Spec Texts:', result.skus?.map(s => s.spec_text));
    
    return result;
  } catch (error) {
    console.error('❌ 创建失败:', error);
  }
}

// ============================================
// 示例2: SPU手动,SKU自动
// ============================================
async function example2_MixedMode() {
  console.log('\n=== 示例2: 混合模式 ===');
  
  try {
    const result = await createProductSPU(
      {
        spu_code: 'SPU-TEST-MANUAL', // 手动指定
        name: '测试商品-混合模式',
        subtitle: 'SPU手动,SKU自动',
        unit: '台',
      },
      [
        {
          // SKU code自动生成: SKU-TEST-MANUAL-01
          specifications: { '配置': '标准版' },
          cost_price: 1000,
          sell_price: 1999,
        },
        {
          // SKU code自动生成: SKU-TEST-MANUAL-02
          specifications: { '配置': '豪华版' },
          cost_price: 1500,
          sell_price: 2999,
        },
      ],
      []
    );
    
    console.log('✅ 创建成功!');
    console.log('SPU Code:', result.spu_code);
    console.log('SKU Codes:', result.skus?.map(s => s.sku_code));
    
    return result;
  } catch (error) {
    console.error('❌ 创建失败:', error);
  }
}

// ============================================
// 示例3: 使用辅助函数预览编码
// ============================================
function example3_PreviewCodes() {
  console.log('\n=== 示例3: 预览生成的编码 ===');
  
  // 生成SPU code
  const spuCode = generateSPUCode();
  console.log('生成的SPU Code:', spuCode);
  
  // 基于SPU code生成SKU codes
  for (let i = 0; i < 3; i++) {
    const skuCode = generateSKUCode(spuCode, i);
    console.log(`  SKU ${i + 1}:`, skuCode);
  }
  
  // 生成规格文本
  const specs = { '颜色': '黑色', '尺寸': 'XL', '材质': '棉' };
  const specText = generateSpecText(specs);
  console.log('规格文本:', specText);
}

// ============================================
// 示例4: 批量创建商品
// ============================================
async function example4_BatchCreate() {
  console.log('\n=== 示例4: 批量创建 ===');
  
  const products = [
    {
      name: '商品A',
      price: 99,
      specs: [{ '颜色': '红' }, { '颜色': '蓝' }],
    },
    {
      name: '商品B',
      price: 199,
      specs: [{ '尺寸': 'S' }, { '尺寸': 'M' }, { '尺寸': 'L' }],
    },
  ];
  
  for (const product of products) {
    try {
      const result = await createProductSPU(
        {
          name: product.name,
          unit: '件',
        },
        product.specs.map(spec => ({
          specifications: spec,
          cost_price: product.price * 0.5,
          sell_price: product.price,
          current_stock: 50,
        })),
        []
      );
      
      console.log(`✅ ${product.name} 创建成功, Code: ${result.spu_code}`);
    } catch (error) {
      console.error(`❌ ${product.name} 创建失败:`, error);
    }
  }
}

// ============================================
// 运行所有示例
// ============================================
async function runAllExamples() {
  console.log('🚀 开始运行商品编号自动生成示例\n');
  
  // 示例3不需要数据库,先运行
  example3_PreviewCodes();
  
  // 以下示例需要数据库连接
  // await example1_FullAutoGenerate();
  // await example2_MixedMode();
  // await example4_BatchCreate();
  
  console.log('\n✨ 示例运行完成!');
  console.log('\n💡 提示: 取消注释数据库相关示例前,请确保:');
  console.log('   1. Rust后端已实现 create_product_spu 命令');
  console.log('   2. 数据库已正确配置');
  console.log('   3. 有有效的用户认证');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export {
  example1_FullAutoGenerate,
  example2_MixedMode,
  example3_PreviewCodes,
  example4_BatchCreate,
};
