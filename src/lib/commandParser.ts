import { getProductSPUs, getProducts, ProductSKU, ProductSPU } from './productService';
import {
  createInventoryTransaction,
  getInventoryStats,
  getInventoryTransactions,
} from './inventoryService';
import {
  calibrateStock,
  checkNegativeAging,
  getLowConfidenceProducts,
} from './inventoryCalibrationService';
import { labelToSalesPeriod, summarizeSalesForPeriod } from './salesService';
import { buildProductsCsv, downloadProductsCsv } from './productExport';
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
  // 导出库存（必须长于「出库」，避免「导出库存」被当成出库）
  {
    keywords: [
      '导出库存表',
      '导出库存',
      '导出产品',
      '导出商品',
      '下载库存',
      '库存表',
    ],
    action: 'export_inventory',
    extractParams: _text => ({ type: 'inventory' }),
  },
  // 出入库方向不明，单独澄清，不写成入库或出库
  {
    keywords: ['出入库'],
    action: 'clarify_stock_io',
    extractParams: _text => ({ type: 'inventory' }),
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
    extractParams: _text => ({ type: 'inventory' }),
  },
  // 库存流水
  {
    keywords: ['库存流水', '出入库记录', '库存变动记录', '库存交易'],
    action: 'list_transactions',
    extractParams: _text => ({ type: 'inventory' }),
  },
  // 盘点：有品名和实际数量才写入，否则只列出待盘点
  {
    keywords: ['待盘点', '哪些要盘点', '库存不准', '盘点', '微盘点'],
    action: 'stocktake',
    extractParams: text => extractStocktake(text),
  },
  // 添加入库
  {
    keywords: ['添加库存', '入库操作', '入库', '进货', 'add stock', 'stock in', 'inbound'],
    action: 'add_stock',
    extractParams: text => {
      const quantityMatch = text.match(/(\d+)\s*(?:个|件|箱|台|套|只)/);
      const productMatch = text.match(/(?:入库|进货|添加)\s*([\u4e00-\u9fa5a-zA-Z0-9]+?)\s*(?:\d+)/);
      return {
        quantity: quantityMatch ? parseInt(quantityMatch[1], 10) : 0,
        productName: productMatch ? productMatch[1] : '',
        type: 'inventory',
      };
    },
  },
  // 减少出库
  {
    keywords: ['减少库存', '出库操作', '销售出库', '出库', 'remove stock', 'stock out', 'outbound'],
    action: 'remove_stock',
    extractParams: text => {
      const quantityMatch = text.match(/(\d+)\s*(?:个|件|箱|台|套|只)/);
      const productMatch = text.match(/(?:出库|销售)\s*([\u4e00-\u9fa5a-zA-Z0-9]+?)\s*(?:\d+)/);
      return {
        quantity: quantityMatch ? parseInt(quantityMatch[1], 10) : 0,
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
    extractParams: _text => ({ type: 'inventory' }),
  },
  // 查询特定产品库存
  {
    keywords: [
      '还有多少',
      '剩余库存',
      '库存多少',
      '库存数量',
      '还有库存',
      '库存还有',
      '还有货',
    ],
    action: 'query_product_stock',
    extractParams: text => {
      const productMatch = text.match(/(.+?)(?:的|还有|剩余|库存|$)/);
      return {
        productName: productMatch ? productMatch[1].trim() : '',
        type: 'inventory',
      };
    },
  },
];

function extractStocktake(text: string): Record<string, any> {
  if (/待盘点|哪些要盘点|库存不准/.test(text)) {
    return { mode: 'list', type: 'inventory' };
  }
  const marked = text.match(/盘点\s*(.+?)\s*(?:实际|实盘)\s*(\d+)/);
  if (marked && marked[1].trim()) {
    return {
      mode: 'write',
      productName: marked[1].trim(),
      quantity: parseInt(marked[2], 10),
      type: 'inventory',
    };
  }
  const simple = text.match(/盘点\s*([\u4e00-\u9fa5a-zA-Z0-9]+)\s*(\d+)\s*(?:个|件|箱|台|套|只)/);
  if (simple) {
    return {
      mode: 'write',
      productName: simple[1],
      quantity: parseInt(simple[2], 10),
      type: 'inventory',
    };
  }
  return { mode: 'list', type: 'inventory' };
}

/**
 * 只约束以「出库 / 入库」开头的关键词。
 * 「出库」前是「导」（导出库存）、「入库」前是「出」或「导」（出入库、导入库存）时跳过。
 * 「出入库」「销售出库」这类更长的词不受这次检查影响。
 */
function keywordAllowed(haystack: string, index: number, keyword: string): boolean {
  if (keyword.startsWith('出库')) {
    const prev = index > 0 ? haystack[index - 1] : '';
    if (prev === '导') return false;
  }
  if (keyword.startsWith('入库')) {
    const prev = index > 0 ? haystack[index - 1] : '';
    if (prev === '出' || prev === '导') return false;
  }
  return true;
}

function keywordHits(text: string, keyword: string): boolean {
  const haystack = text.toLowerCase();
  const needle = keyword.toLowerCase();
  if (!needle) return false;
  let from = 0;
  while (from <= haystack.length) {
    const index = haystack.indexOf(needle, from);
    if (index < 0) return false;
    if (keywordAllowed(haystack, index, needle)) return true;
    from = index + 1;
  }
  return false;
}

/**
 * 解析用户指令。
 * recordUnknown 为 false 时不写入未识别指令，供路由在还有后续处理器时使用。
 */
export function parseCommand(
  text: string,
  options?: { recordUnknown?: boolean },
): CommandResult {
  const source = text.trim();
  const hits: Array<{ length: number; patternIndex: number; pattern: CommandPattern }> = [];

  commandPatterns.forEach((pattern, patternIndex) => {
    for (const keyword of pattern.keywords) {
      if (keywordHits(source, keyword)) {
        hits.push({ length: keyword.length, patternIndex, pattern });
      }
    }
  });

  hits.sort((a, b) => b.length - a.length || a.patternIndex - b.patternIndex);

  if (hits.length > 0) {
    const pattern = hits[0].pattern;
    return {
      action: pattern.action,
      params: pattern.extractParams(source),
      confidence: 0.9,
      message: `已识别指令: ${pattern.action}`,
    };
  }

  const result: CommandResult = {
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
      '• "导出库存" - 下载库存表\n' +
      '• "待盘点" - 查看需要盘点的商品\n' +
      '• "库存预警" - 查看低库存产品\n' +
      '• "库存流水" - 查看最近库存变动\n\n' +
      '📈 **数据分析**\n' +
      '• "销售分析" - 查看销售数据\n' +
      '• "今日简报" - 查看经营简报',
  };

  if (options?.recordUnknown !== false) {
    saveUnrecognizedCommand(text, {
      context: {
        currentPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
      },
    });
  }

  return result;
}

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

type ResolvedProduct =
  | { ok: true; spu: ProductSPU; sku: ProductSKU }
  | { ok: false; message: string };

async function resolveUniqueProduct(productName: string, verb: string): Promise<ResolvedProduct> {
  const found = await getProductSPUs({
    limit: 5,
    search: productName,
  });
  const spus = Array.isArray(found) ? found : [];

  if (spus.length === 0) {
    return { ok: false, message: `🔍 未找到名为 "${productName}" 的产品。` };
  }

  if (spus.length > 1) {
    const lines = spus.map(spu => `• ${spu.name}（${spu.spu_code}）`).join('\n');
    return {
      ok: false,
      message: `找到 ${spus.length} 个名称相近的产品，没有执行${verb}。请说得更具体：\n\n${lines}`,
    };
  }

  const spu = spus[0];
  const skus = spu.skus ?? [];
  if (skus.length === 0) {
    return { ok: false, message: `⚠️ 产品 "${spu.name}" 还没有 SKU，请先添加 SKU。` };
  }
  if (skus.length > 1) {
    const defaults = skus.filter(sku => sku.is_default);
    if (defaults.length !== 1) {
      const lines = skus.map(sku => `• ${sku.sku_code}`).join('\n');
      return {
        ok: false,
        message: `产品「${spu.name}」有多个 SKU，没有执行${verb}。请指定 SKU：\n\n${lines}`,
      };
    }
    return { ok: true, spu, sku: defaults[0] };
  }
  return { ok: true, spu, sku: skus[0] };
}

async function exportInventoryTable(): Promise<string> {
  const products = await getProducts({ limit: 5000 });
  if (!Array.isArray(products) || products.length === 0) {
    return '没有可导出的产品。';
  }
  const file = buildProductsCsv(products);
  downloadProductsCsv(file);
  return `已导出库存表 ${file.filename}，共 ${file.rowCount} 行。`;
}

async function renderSalesSummary(periodLabel: string): Promise<string> {
  const summary = await summarizeSalesForPeriod(labelToSalesPeriod(periodLabel));
  if (!summary) {
    return `📈 **销售分析（${periodLabel}）**\n\n销售数据暂时无法获取。`;
  }
  return (
    `📈 **销售分析（${periodLabel}）**\n\n` +
    `订单 ${summary.count} 笔，金额 ¥${summary.amount.toFixed(2)}。`
  );
}

async function renderStocktakeList(): Promise<string> {
  const [low, aging] = await Promise.all([
    getLowConfidenceProducts().catch(() => []),
    checkNegativeAging().catch(() => []),
  ]);

  const lowList = Array.isArray(low) ? low : [];
  const agingList = Array.isArray(aging) ? aging : [];

  if (lowList.length === 0 && agingList.length === 0) {
    return (
      '当前没有待盘点的商品。\n\n' +
      '可以到库存页查看全部库存。要按实盘改数，请说「盘点 iPad 实际 12件」。'
    );
  }

  let result = '📋 **待盘点**\n\n';
  if (lowList.length > 0) {
    result += '置信度偏低：\n';
    lowList.slice(0, 20).forEach((item, index) => {
      const reason = item.reason || `${item.aging_days} 天未校准`;
      result += `${index + 1}. ${item.product_name || item.spu_code}，库存 ${item.current_stock}，${reason}\n`;
    });
    result += '\n';
  }
  if (agingList.length > 0) {
    result += '负库存：\n';
    agingList.slice(0, 20).forEach((item, index) => {
      result += `${index + 1}. ${item.product_name}，库存 ${item.current_stock}，已负 ${item.aging_days} 天\n`;
    });
    result += '\n';
  }
  result += '以上只是清单，没有改库存。请到库存页盘点，或说「盘点 产品名 实际 数量件」。';
  return result;
}

function transactionLabel(type: string): string {
  switch (type) {
    case 'inbound':
      return '入库';
    case 'outbound':
      return '出库';
    case 'adjustment':
      return '调整';
    case 'transfer':
      return '调拨';
    default:
      return type;
  }
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
        const found = await getProductSPUs({
          limit: 20,
          search: searchQuery || undefined,
        });
        return formatProductList(Array.isArray(found) ? found : []);
      }

      case 'query_product_stock': {
        const productName = command.params.productName || '';
        if (!productName) {
          return '❓ 请指定要查询的产品名称，例如：“iPhone 还有多少库存？”';
        }

        const found = await getProductSPUs({
          limit: 10,
          search: productName,
        });
        const spus = Array.isArray(found) ? found : [];

        if (spus.length === 0) {
          return `🔍 未找到名为 "${productName}" 的产品。请检查产品名称是否正确。`;
        }

        let result = `📦 **"${productName}" 的库存信息：**\n\n`;
        spus.forEach((spu: ProductSPU) => {
          const totalStock = spu.skus?.reduce((sum, sku) => sum + sku.current_stock, 0) || 0;
          const minStock = spu.skus?.reduce((sum, sku) => sum + sku.min_stock, 0) || 0;
          const maxStock = spu.skus?.reduce((sum, sku) => sum + sku.max_stock, 0) || 0;

          const stockPercent =
            maxStock > 0
              ? ((totalStock / maxStock) * 100).toFixed(0)
              : 0;
          const statusIcon =
            totalStock === 0
              ? '❌'
              : totalStock <= minStock
                ? '⚠️'
                : '✅';

          result += `• **${spu.name}** (SPU: ${spu.spu_code})\n`;
          result += `  当前库存: ${totalStock} ${spu.unit} ${statusIcon}\n`;
          result += `  最低库存: ${minStock} ${spu.unit}\n`;
          result += `  最高库存: ${maxStock} ${spu.unit}\n`;
          result += `  库存使用率: ${stockPercent}%\n`;
          if (spu.skus && spu.skus.length > 0) {
            result += `  SKU数量: ${spu.skus.length}个\n`;
          }
          result += '\n';
        });

        return result;
      }

      case 'query_inventory': {
        const stats = await getInventoryStats();
        return formatInventoryStats(stats);
      }

      case 'export_inventory':
        return exportInventoryTable();

      case 'clarify_stock_io':
        return '「出入库」里同时有入库和出库。请分开说，例如「入库 iPhone 10个」或「出库 iPad 5件」。';

      case 'list_transactions': {
        const transactions = await getInventoryTransactions().catch(() => null);
        if (!Array.isArray(transactions)) {
          return '暂时无法读取库存流水。';
        }
        if (transactions.length === 0) {
          return '最近没有库存流水。';
        }
        const recent = [...transactions]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        let result = '📒 **最近库存流水**\n\n';
        recent.forEach((item, index) => {
          const when = item.created_at ? new Date(item.created_at).toLocaleString() : '';
          result += `${index + 1}. ${transactionLabel(item.transaction_type)} ${item.quantity}`;
          if (when) result += `，${when}`;
          if (item.reason) result += `，${item.reason}`;
          result += '\n';
        });
        return result;
      }

      case 'stocktake': {
        if (command.params.mode !== 'write') {
          return renderStocktakeList();
        }
        const quantity = command.params.quantity;
        const productName = command.params.productName || '';
        if (!quantity || quantity <= 0) {
          return '❌ 请给出实际盘点数量，例如：“盘点 iPad 实际 12件”';
        }
        if (!productName) {
          return '❓ 请指定产品名称，例如：“盘点 iPad 实际 12件”';
        }
        const resolved = await resolveUniqueProduct(productName, '盘点');
        if (!resolved.ok) return resolved.message;
        const { spu, sku } = resolved;
        const result = await calibrateStock({
          product_id: sku.id,
          calibration_type: 'micro_count',
          expected_stock: sku.current_stock,
          actual_stock: quantity,
          reason: 'AI助手盘点',
          triggered_by: 'manual',
        });
        return (
          `✅ **盘点已记录**\n\n` +
          `产品: ${spu.name} (SPU: ${spu.spu_code})\n` +
          `SKU: ${sku.sku_code}\n` +
          `实际库存: ${quantity} ${spu.unit}\n` +
          `新库存: ${result.new_stock} ${spu.unit}`
        );
      }

      case 'add_stock': {
        const { quantity, productName } = command.params;

        if (!quantity || quantity <= 0) {
          return '❌ 请输入有效的数量，例如：“入库 iPhone 10个”';
        }

        if (!productName) {
          return '❓ 请指定产品名称，例如：“入库 iPhone 10个”';
        }

        const resolved = await resolveUniqueProduct(productName, '入库');
        if (!resolved.ok) return resolved.message;
        const { spu, sku } = resolved;

        try {
          await createInventoryTransaction({
            product_id: sku.id,
            transaction_type: 'inbound',
            quantity: quantity,
            reason: 'AI助手入库',
            notes: `通过 AI Chat 入库 ${quantity} ${spu.unit}`,
          });

          return (
            `✅ **入库成功！**\n\n` +
            `产品: ${spu.name} (SPU: ${spu.spu_code})\n` +
            `SKU: ${sku.sku_code}\n` +
            `数量: +${quantity} ${spu.unit}\n` +
            `原库存: ${sku.current_stock} ${spu.unit}\n` +
            `新库存: ${sku.current_stock + quantity} ${spu.unit}\n\n` +
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

        const resolved = await resolveUniqueProduct(productName, '出库');
        if (!resolved.ok) return resolved.message;
        const { spu, sku } = resolved;

        if (sku.current_stock < quantity) {
          return (
            `⚠️ **库存不足！**\n\n` +
            `产品: ${spu.name} (SPU: ${spu.spu_code})\n` +
            `SKU: ${sku.sku_code}\n` +
            `请求出库: ${quantity} ${spu.unit}\n` +
            `当前库存: ${sku.current_stock} ${spu.unit}\n\n` +
            `建议: 请先入库补充库存。`
          );
        }

        try {
          await createInventoryTransaction({
            product_id: sku.id,
            transaction_type: 'outbound',
            quantity: quantity,
            reason: 'AI助手出库',
            notes: `通过 AI Chat 出库 ${quantity} ${spu.unit}`,
          });

          return (
            `✅ **出库成功！**\n\n` +
            `产品: ${spu.name} (SPU: ${spu.spu_code})\n` +
            `SKU: ${sku.sku_code}\n` +
            `数量: -${quantity} ${spu.unit}\n` +
            `原库存: ${sku.current_stock} ${spu.unit}\n` +
            `新库存: ${sku.current_stock - quantity} ${spu.unit}\n\n` +
            `📝 交易记录已保存。`
          );
        } catch (error: any) {
          return `❌ 出库失败：${error.message || '未知错误'}`;
        }
      }

      case 'analyze_sales':
        return renderSalesSummary(command.params.period || '本月');

      case 'generate_report': {
        const reportType = command.params.reportType || '综合';
        if (reportType === '库存') {
          const exported = await exportInventoryTable();
          return `📋 **库存报表**\n\n${exported}`;
        }
        if (reportType === '销售') {
          const sales = await renderSalesSummary('本月');
          return `📋 **销售报表**\n\n${sales}`;
        }
        return (
          `📋 **${reportType}报表**\n\n` +
          '可以直接说「导出库存」「销售分析」或「今日简报」。'
        );
      }

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
          const current = product.current_stock ?? product.total_stock ?? 0;
          const deficit = product.min_stock - current;
          result += `${index + 1}. **${product.name}** (${product.sku || product.spu_code || ''})\n`;
          result += `   当前库存: ${current} / 最低库存: ${product.min_stock}\n`;
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
