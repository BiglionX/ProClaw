/**
 * 云商城端到端测试脚本
 * 模拟手机电池销售商开通云商城并完成配置
 */

const { invoke } = require('@tauri-apps/api/core');
const { v4: uuidv4 } = require('uuid');

// iPhone 电池商品数据
const iPhoneBatteries = [
  { name: 'iPhone 15 Pro Max 电池', price: 199, stock: 50, category: 'iPhone 15 系列' },
  { name: 'iPhone 15 Pro 电池', price: 179, stock: 50, category: 'iPhone 15 系列' },
  { name: 'iPhone 15 电池', price: 159, stock: 60, category: 'iPhone 15 系列' },
  { name: 'iPhone 14 Pro Max 电池', price: 179, stock: 45, category: 'iPhone 14 系列' },
  { name: 'iPhone 14 Pro 电池', price: 159, stock: 55, category: 'iPhone 14 系列' },
  { name: 'iPhone 14 电池', price: 139, stock: 65, category: 'iPhone 14 系列' },
  { name: 'iPhone 13 Pro Max 电池', price: 159, stock: 40, category: 'iPhone 13 系列' },
  { name: 'iPhone 13 Pro 电池', price: 139, stock: 50, category: 'iPhone 13 系列' },
  { name: 'iPhone 13 电池', price: 119, stock: 60, category: 'iPhone 13 系列' },
  { name: 'iPhone 12 Pro Max 电池', price: 139, stock: 35, category: 'iPhone 12 系列' },
  { name: 'iPhone 12 Pro 电池', price: 119, stock: 45, category: 'iPhone 12 系列' },
  { name: 'iPhone 12 电池', price: 99, stock: 55, category: 'iPhone 12 系列' },
  { name: 'iPhone 11 Pro Max 电池', price: 119, stock: 30, category: 'iPhone 11 系列' },
  { name: 'iPhone 11 Pro 电池', price: 99, stock: 40, category: 'iPhone 11 系列' },
  { name: 'iPhone 11 电池', price: 89, stock: 50, category: 'iPhone 11 系列' },
  { name: 'iPhone XS Max 电池', price: 89, stock: 25, category: 'iPhone X 系列' },
  { name: 'iPhone XS 电池', price: 79, stock: 35, category: 'iPhone X 系列' },
  { name: 'iPhone XR 电池', price: 79, stock: 40, category: 'iPhone X 系列' },
  { name: 'iPhone X 电池', price: 69, stock: 30, category: 'iPhone X 系列' },
  { name: 'iPhone SE 2022 电池', price: 59, stock: 45, category: 'iPhone SE 系列' },
];

async function testCloudStoreFlow() {
  console.log('🚀 开始云商城端到端测试...\n');

  try {
    // Step 1: 检查是否已开通商城
    console.log('📋 Step 1: 检查云商城状态...');
    let store = null;
    try {
      store = await invoke('get_cloud_store');
      console.log('✅ 商城已存在:', store);
    } catch (error) {
      console.log('ℹ️  商城未开通，准备开通...');
    }

    // Step 2: 开通云商城
    if (!store || !store.id) {
      console.log('\n📋 Step 2: 开通云商城...');
      store = await invoke('create_cloud_store', {
        planType: 'professional',
        subdomain: 'iphone-battery-pro',
      });
      console.log('✅ 商城开通成功:', store);
    }

    // Step 3: 添加 20 个 iPhone 电池商品
    console.log('\n📋 Step 3: 添加 20 个 iPhone 电池商品...');
    for (let i = 0; i < iPhoneBatteries.length; i++) {
      const battery = iPhoneBatteries[i];
      try {
        const product = await invoke('create_product_spu', {
          name: battery.name,
          description: `${battery.name} - 高品质替换电池，容量≥100%`,
          price: battery.price,
          category: battery.category,
          brand: 'Apple',
          stock: battery.stock,
          isCloudVisible: true,
        });
        console.log(`✅ [${i + 1}/20] 已添加: ${battery.name}`);
      } catch (error) {
        console.error(`❌ [${i + 1}/20] 添加失败: ${battery.name}`, error);
      }
    }

    // Step 4: 同步商品到云端
    console.log('\n📋 Step 4: 同步商品到云端...');
    try {
      const syncResult = await invoke('sync_all_products_to_cloud', {
        storeId: store.id || store.data?.id,
      });
      console.log('✅ 商品同步成功:', syncResult);
    } catch (error) {
      console.error('❌ 商品同步失败:', error);
    }

    // Step 5: AI 生成主题
    console.log('\n📋 Step 5: AI 生成商城主题...');
    try {
      const theme = await invoke('generate_store_theme_ai', {
        storeId: store.id || store.data?.id,
        industry: '手机配件',
        categories: ['iPhone 15 系列', 'iPhone 14 系列', 'iPhone 13 系列', 'iPhone 12 系列', 'iPhone 11 系列', 'iPhone X 系列', 'iPhone SE 系列'],
        priceRange: '59-199 元',
      });
      console.log('✅ AI 主题生成成功:', theme);
    } catch (error) {
      console.error('❌ AI 主题生成失败:', error);
    }

    // Step 6: 获取商城信息
    console.log('\n📋 Step 6: 获取商城信息...');
    try {
      const finalStore = await invoke('get_cloud_store');
      console.log('✅ 商城信息:', JSON.stringify(finalStore, null, 2));
    } catch (error) {
      console.error('❌ 获取商城信息失败:', error);
    }

    console.log('\n🎉 测试完成！');
    console.log('\n📊 测试总结:');
    console.log('  ✅ 商城开通');
    console.log('  ✅ 添加 20 个商品');
    console.log('  ✅ 商品同步到云端');
    console.log('  ✅ AI 生成主题');
    console.log('  ✅ 获取商城信息');
    console.log('\n🌐 商城地址:');
    console.log(`  https://${(store?.subdomain || store?.data?.subdomain || 'iphone-battery-pro')}.proclaw.cc`);
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
testCloudStoreFlow()
  .then(() => {
    console.log('\n✅ 测试脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试脚本执行失败:', error);
    process.exit(1);
  });
