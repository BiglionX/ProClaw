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
    keywords: ['添加产品', '新建产品', '创建产品', 'add product', 'create product'],
    action: 'create_product',
    extractParams: (text) => {
      // 提取产品名称
      const nameMatch = text.match(/(?:添加|新建|创建)\s*(?:产品)?\s*["']?([^"'\s,]+)["']?/);
      return {
        name: nameMatch ? nameMatch[1] : '',
        type: 'product',
      };
    },
  },
  // 查询产品
  {
    keywords: ['查询产品', '查找产品', '搜索产品', '产品列表', 'search product', 'list products'],
    action: 'query_products',
    extractParams: (text) => {
      const searchMatch = text.match(/(?:查询|查找|搜索)\s*(?:产品)?\s*["']?([^"'\s,]+)["']?/);
      return {
        search: searchMatch ? searchMatch[1] : '',
        type: 'product',
      };
    },
  },
  // 查询库存
  {
    keywords: ['查询库存', '查看库存', '库存查询', 'check inventory', 'stock query'],
    action: 'query_inventory',
    extractParams: (text) => {
      return {
        type: 'inventory',
      };
    },
  },
  // 添加库存
  {
    keywords: ['添加库存', '入库', '入库操作', 'add stock', 'stock in'],
    action: 'add_stock',
    extractParams: (text) => {
      const quantityMatch = text.match(/(\d+)\s*(?:个|件|箱)/);
      return {
        quantity: quantityMatch ? parseInt(quantityMatch[1]) : 0,
        type: 'inventory',
      };
    },
  },
  // 减少库存
  {
    keywords: ['减少库存', '出库', '出库操作', 'remove stock', 'stock out'],
    action: 'remove_stock',
    extractParams: (text) => {
      const quantityMatch = text.match(/(\d+)\s*(?:个|件|箱)/);
      return {
        quantity: quantityMatch ? parseInt(quantityMatch[1]) : 0,
        type: 'inventory',
      };
    },
  },
  // 销售分析
  {
    keywords: ['销售分析', '分析销售', '销售报告', 'sales analysis', 'sales report'],
    action: 'analyze_sales',
    extractParams: (text) => {
      const periodMatch = text.match(/(本月|本周|今年|去年)/);
      return {
        period: periodMatch ? periodMatch[1] : '本月',
        type: 'sales',
      };
    },
  },
  // 生成报表
  {
    keywords: ['生成报表', '创建报表', '报表', 'generate report', 'create report'],
    action: 'generate_report',
    extractParams: (text) => {
      const typeMatch = text.match(/(库存|销售|产品|采购)\s*报表/);
      return {
        reportType: typeMatch ? typeMatch[1] : '综合',
        type: 'report',
      };
    },
  },
  // 库存预警
  {
    keywords: ['库存预警', '低库存', '库存不足', 'stock alert', 'low stock'],
    action: 'check_stock_alert',
    extractParams: (text) => {
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
  return {
    action: 'unknown',
    params: { originalText: text },
    confidence: 0.3,
    message: '抱歉,我无法理解您的指令。请尝试以下操作:\n• 添加产品\n• 查询库存\n• 销售分析\n• 生成报表',
  };
}

/**
 * 执行解析后的命令
 */
export async function executeCommand(command: CommandResult): Promise<string> {
  console.log('执行命令:', command.action, command.params);
  
  // TODO: 这里将连接到实际的 AI 后端或 Tauri Commands
  // 现在返回模拟响应
  
  switch (command.action) {
    case 'create_product':
      return `正在创建产品 "${command.params.name}"... (功能开发中)`;
    
    case 'query_products':
      return '正在查询产品列表... (功能开发中)';
    
    case 'query_inventory':
      return '正在查询库存信息... (功能开发中)';
    
    case 'add_stock':
      return `正在添加入库记录,数量: ${command.params.quantity}... (功能开发中)`;
    
    case 'remove_stock':
      return `正在添加出库记录,数量: ${command.params.quantity}... (功能开发中)`;
    
    case 'analyze_sales':
      return `正在生成${command.params.period}销售分析... (功能开发中)`;
    
    case 'generate_report':
      return `正在生成${command.params.reportType}报表... (功能开发中)`;
    
    case 'check_stock_alert':
      return '正在检查库存预警... (功能开发中)';
    
    default:
      return command.message;
  }
}
