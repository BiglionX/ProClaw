import { getProducts } from './productService';
import {
  createInventoryTransaction,
  getInventoryStats,
} from './inventoryService';
import { saveUnrecognizedCommand } from './unrecognizedCommandService';

export interface CommandResult {
  action: string;
  params: Record<string, any>;
  confidence: number;
  message: string;
}

interface CommandPattern {
  keywords: string[];
  action: string;
  extractParams: (text: string) => Record<string, any>;
}

const commandPatterns: CommandPattern[] = [
  // 添加产品
  {
    keywords: [
      '添加产品',
      '新建产品',
      '创建产品',
      '新增产品',
      'add product',
      'create product',
      'new product',
    ],
    action: 'create_product',
    extractParams: text => {
      // 提取产品名称
      const nameMatch = text.match(
        /(?:添加|新建|创建|新增)\s*(?:产品)?\s*["']?([^"'\s,]+)["']?/
      );
      return {
        name: nameMatch ? nameMatch[1] : '',
        type: 'product',
      };
    },
  },
  // 查询产品列表
  {
    keywords: [
      '查询产品',
      '查找产品',
      '搜索产品',
      '产品列表',
      '显示产品',
      '所有产品',
      'search product',
      'list products',
      'show products',
      'all products',
    ],
    action: 'query_products',
    extractParams: text => {
      const searchMatch = text.match(
        /(?:查询|查找|搜索|显示)\s*(?:产品)?\s*["']?([^"'\s,]+)["']?/
      );
      return {
        search: searchMatch ? searchMatch[1] : '',
        type: 'product',
      };
    },
  },
  // 查询特定产品库存
  {
    keywords: [
      '库存',
      '还有多少',
      '剩余库存',
      'stock',
      'inventory',
    ],
    action: 'query_product_stock',
    extractParams: text => {
      // 尝试提取产品名称
      const productMatch = text.match(/(.+?)(?:的|还有|剩余|库存|$)/);
      return {
        productName: productMatch ? productMatch[1].trim() : '',
        type: 'inventory',
      };
    },
  },
  // 查询库存统计
  {
    keywords: [
      '查询库存',
      '查看库存',
      '库存查询',
      '库存统计',
      '库存概览',
      'check inventory',
      'stock query',
      'inventory stats',
    ],
    action: 'query_inventory',
    extractParams: _text => {
      return {
        type: 'inventory',
      };
    },
  },
  // 添加入库
  {
    keywords: ['添加库存', '入库', '入库操作', '进货', 'add stock', 'stock in', 'inbound'],
    action: 'add_stock',
    extractParams: text => {
      const quantityMatch = text.match(/(\d+)\s*(?:个|件|箱|台|套|只)/);
      const productMatch = text.match(/(?:入库|进货|添加)\s*([\u4e00-\u9fa5a-zA-Z0-9]+?)\s*(?:\d+)/);
      return {
        quantity: quantityMatch ? parseInt(quantityMatch[1]) : 0,
        productName: productMatch ? productMatch[1] : '',
        type: 'inventory',
      };
    },
  },
  // 减少出库
  {
    keywords: ['减少库存', '出库', '出库操作', '销售出库', 'remove stock', 'stock out', 'outbound'],
    action: 'remove_stock',
    extractParams: text => {
      const quantityMatch = text.match(/(\d+)\s*(?:个|件|箱|台|套|只)/);
      const productMatch = text.match(/(?:出库|销售)\s*([\u4e00-\u9fa5a-zA-Z0-9]+?)\s*(?:\d+)/);
      return {
        quantity: quantityMatch ? parseInt(quantityMatch[1]) : 0,
        productName: productMatch ? productMatch[1] : '',
        type: 'inventory',
      };
    },
  },
  // 销售分析
  {
    keywords: [
      '销售分析',
      '分析销售',
      '销售报告',
      '销售数据',
      'sales analysis',
      'sales report',
    ],
    action: 'analyze_sales',
    extractParams: text => {
      const periodMatch = text.match(/(本月|本周|今年|去年|上月)/);
      return {
        period: periodMatch ? periodMatch[1] : '本月',
        type: 'sales',
      };
    },
  },
  // 生成报表
  {
    keywords: [
      '生成报表',
      '创建报表',
      '报表',
      'generate report',
      'create report',
    ],
    action: 'generate_report',
    extractParams: text => {
      const typeMatch = text.match(/(库存|销售|产品|采购)\s*报表/);
      return {
        reportType: typeMatch ? typeMatch[1] : '综合',
        type: 'report',
      };
    },
  },
  // 库存预警
  {
    keywords: [
      '库存预警',
      '低库存',
      '库存不足',
      '缺货',
      '哪些产品库存不足',
      'stock alert',
      'low stock',
    ],
    action: 'check_stock_alert',
    extractParams: _text => {
      return {
        type: 'inventory',
      };
    },
  },
];

/**
 * 解析用户指令
 */
export function parseCommand(text: string): CommandResult {
  const lowerText = text.toLowerCase().trim();

  // 尝试匹配命令模式
  for (const pattern of commandPatterns) {
    const matched = pattern.keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );

    if (matched) {
      const params = pattern.extractParams(text);
      return {
        action: pattern.action,
        params,
        confidence: 0.9,
        message: `已识别指令: ${pattern.action}`,
      };
    }
  }

  // 如果没有匹配到预定义的命令
  const result = {
    action: 'unknown',
    params: { originalText: text },
    confidence: 0.3,
    message:
      '抱歉，我无法理解您的指令。您可以尝试以下操作：\n\n' +
      '📦 **产品管理**\n' +
      '• "查询产品 iPhone" - 搜索产品\n' +
      '• "添加产品 XXX" - 创建新产品\n\n' +
      '📊 **库存管理**\n' +
      '• "查询库存" - 查看库存统计\n' +
      '• "iPhone 还有多少库存" - 查询特定产品库存\n' +
      '• "入库 iPhone 10个" - 添加入库记录\n' +
      '• "出库 iPad 5件" - 添加出库记录\n' +
      '• "库存预警" - 查看低库存产品\n\n' +
      '📈 **数据分析**\n' +
      '• "销售分析" - 查看销售数据\n' +
      '• "生成库存报表" - 生成报表',
  };

  // 收集未识别的指令
  saveUnrecognizedCommand(text, {
    context: {
      currentPage: window.location.pathname,
    },
  });

  return result;
}

/**
 * 格式化产品列表
 */
function formatProductList(products: any[]): string {
  if (products.length === 0) {
    return '📦 未找到匹配的产品';
  }

  let result = `📦 找到 ${products.length} 个产品：\n\n`;
  products.forEach((product, index) => {
    const stockStatus =
      product.current_stock <= product.min_stock
        ? ' ⚠️ 低库存'
        : product.current_stock === 0
          ? ' ❌ 无库存'
          : ' ✅';
    result += `${index + 1}. **${product.name}**\n`;
    result += `   SKU: ${product.sku}\n`;
    result += `   价格: ¥${product.sell_price.toFixed(2)}\n`;
    result += `   库存: ${product.current_stock} ${product.unit}${stockStatus}\n\n`;
  });

  return result;
}

/**
 * 格式化库存统计
 */
function formatInventoryStats(stats: any): string {
  let result = '📊 **库存统计概览**\n\n';
  result += `总产品数: ${stats.total_products}\n`;
  result += `低库存产品: ${stats.low_stock_count} ⚠️\n`;
  result += `零库存产品: ${stats.zero_stock_count} ❌\n`;
  result += `今日交易: ${stats.today_transactions}\n`;
  result += `库存总值: ¥${stats.total_value.toFixed(2)}\n\n`;

  if (stats.low_stock_products && stats.low_stock_products.length > 0) {
    result += '⚠️ **低库存预警:**\n';
    stats.low_stock_products.forEach((product: any) => {
      result += `• ${product.name} (SKU: ${product.sku}): ${product.current_stock}/${product.min_stock}\n`;
    });
    result += '\n建议: 及时补货以上产品';
  }

  return result;
}

/**
 * 执行解析后的命令
 */
export async function executeCommand(command: CommandResult): Promise<string> {
  try {
    switch (command.action) {
      case 'create_product':
        return (
          '➕ **添加产品**\n\n' +
          '请点击左侧菜单的“商品库”->“添加产品”按钮，或点击快捷操作面板中的“添加产品”卡片。\n\n' +
          '💡 提示：您需要填写产品名称、SKU、价格等信息。'
        );

      case 'query_products': {
        const searchQuery = command.params.search || '';
        const products = await getProducts({
          limit: 20,
          search: searchQuery || undefined,
        });
        return formatProductList(products);
      }

      case 'query_product_stock': {
        const productName = command.params.productName || '';
        if (!productName) {
          return '❓ 请指定要查询的产品名称，例如：“iPhone 还有多少库存？”';
        }

        const products = await getProducts({
          limit: 10,
          search: productName,
        });

        if (products.length === 0) {
          return `🔍 未找到名为 "${productName}" 的产品。请检查产品名称是否正确。`;
        }

        let result = `📦 **"${productName}" 的库存信息：**\n\n`;
        products.forEach(product => {
          const stockPercent =
            product.max_stock > 0
              ? ((product.current_stock / product.max_stock) * 100).toFixed(0)
              : 0;
          const statusIcon =
            product.current_stock === 0
              ? '❌'
              : product.current_stock <= product.min_stock
                ? '⚠️'
                : '✅';

          result += `• **${product.name}** (${product.sku})\n`;
          result += `  当前库存: ${product.current_stock} ${product.unit} ${statusIcon}\n`;
          result += `  最低库存: ${product.min_stock} ${product.unit}\n`;
          result += `  最高库存: ${product.max_stock} ${product.unit}\n`;
          result += `  库存使用率: ${stockPercent}%\n\n`;
        });

        return result;
      }

      case 'query_inventory': {
        const stats = await getInventoryStats();
        return formatInventoryStats(stats);
      }

      case 'add_stock': {
        const { quantity, productName } = command.params;

        if (!quantity || quantity <= 0) {
          return '❌ 请输入有效的数量，例如：“入库 iPhone 10个”';
        }

        if (!productName) {
          return '❓ 请指定产品名称，例如：“入库 iPhone 10个”';
        }

        // 查找产品
        const products = await getProducts({
          limit: 5,
          search: productName,
        });

        if (products.length === 0) {
          return `🔍 未找到名为 "${productName}" 的产品。请先添加该产品。`;
        }

        // 使用第一个匹配的产品
        const product = products[0];

        try {
          await createInventoryTransaction({
            product_id: product.id,
            transaction_type: 'inbound',
            quantity: quantity,
            reason: 'AI助手入库',
            notes: `通过 AI Chat 入库 ${quantity} ${product.unit}`,
          });

          return (
            `✅ **入库成功！**\n\n` +
            `产品: ${product.name} (${product.sku})\n` +
            `数量: +${quantity} ${product.unit}\n` +
            `原库存: ${product.current_stock} ${product.unit}\n` +
            `新库存: ${product.current_stock + quantity} ${product.unit}\n\n` +
            `📝 交易记录已保存。`
          );
        } catch (error: any) {
          return `❌ 入库失败：${error.message || '未知错误'}`;
        }
      }

      case 'remove_stock': {
        const { quantity, productName } = command.params;

        if (!quantity || quantity <= 0) {
          return '❌ 请输入有效的数量，例如：“出库 iPad 5件”';
        }

        if (!productName) {
          return '❓ 请指定产品名称，例如：“出库 iPad 5件”';
        }

        // 查找产品
        const products = await getProducts({
          limit: 5,
          search: productName,
        });

        if (products.length === 0) {
          return `🔍 未找到名为 "${productName}" 的产品。`;
        }

        // 使用第一个匹配的产品
        const product = products[0];

        // 检查库存是否充足
        if (product.current_stock < quantity) {
          return (
            `⚠️ **库存不足！**\n\n` +
            `产品: ${product.name} (${product.sku})\n` +
            `请求出库: ${quantity} ${product.unit}\n` +
            `当前库存: ${product.current_stock} ${product.unit}\n\n` +
            `建议: 请先入库补充库存。`
          );
        }

        try {
          await createInventoryTransaction({
            product_id: product.id,
            transaction_type: 'outbound',
            quantity: quantity,
            reason: 'AI助手出库',
            notes: `通过 AI Chat 出库 ${quantity} ${product.unit}`,
          });

          return (
            `✅ **出库成功！**\n\n` +
            `产品: ${product.name} (${product.sku})\n` +
            `数量: -${quantity} ${product.unit}\n` +
            `原库存: ${product.current_stock} ${product.unit}\n` +
            `新库存: ${product.current_stock - quantity} ${product.unit}\n\n` +
            `📝 交易记录已保存。`
          );
        } catch (error: any) {
          return `❌ 出库失败：${error.message || '未知错误'}`;
        }
      }

      case 'analyze_sales':
        return (
          `📈 **销售分析（${command.params.period}）**\n\n` +
          '该功能正在开发中，将在 v1.0 版本提供。\n\n' +
          '💡 您可以先在“数据分析”页面查看基础销售数据。'
        );

      case 'generate_report':
        return (
          `📋 **生成${command.params.reportType}报表**\n\n` +
          '报表生成功能正在开发中，将在 v1.0 版本提供。\n\n' +
          '💡 您可以先在对应页面手动导出数据。'
        );

      case 'check_stock_alert': {
        const stats = await getInventoryStats();

        if (stats.low_stock_products.length === 0) {
          return (
            '✅ **库存状态良好！**\n\n' +
            '目前没有低库存产品，所有产品库存充足。\n\n' +
            `📊 总产品数: ${stats.total_products}\n` +
            `📦 库存总值: ¥${stats.total_value.toFixed(2)}`
          );
        }

        let result = `⚠️ **库存预警提醒**\n\n`;
        result += `发现 ${stats.low_stock_products.length} 个产品库存不足：\n\n`;

        stats.low_stock_products.forEach((product: any, index: number) => {
          const deficit = product.min_stock - product.current_stock;
          result += `${index + 1}. **${product.name}** (${product.sku})\n`;
          result += `   当前库存: ${product.current_stock} / 最低库存: ${product.min_stock}\n`;
          result += `   需要补货: ${deficit} ${product.unit || '个'}\n\n`;
        });

        result += '💡 建议: 请及时采购以上产品，避免缺货影响销售。';

        return result;
      }

      default:
        return command.message;
    }
  } catch (error: any) {
    console.error('Command execution error:', error);
    return (
      '❌ **执行出错**\n\n' +
      `错误信息: ${error.message || '未知错误'}\n\n` +
      '💡 建议: 请重试或联系技术支持。'
    );
  }
}
