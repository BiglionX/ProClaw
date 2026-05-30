/**
 * ProClaw-Light AI 助手服务
 * 四库联动：商品库 + 订单数据 + 问答库 + 资料库 + 媒体库
 */

import { matchQABestAnswer } from './qaLibraryService';
import { searchKnowledge } from './knowledgeBaseService';
import { getProducts, type Product } from './productService';

export interface AIResponse {
  text: string;
  sources: Array<{
    type: 'product' | 'order' | 'qa' | 'knowledge' | 'media';
    title: string;
    reference?: string;
  }>;
}

export type QueryIntent = 'data_query' | 'content_create' | 'customer_service' | 'knowledge_query' | 'unknown';

/**
 * 分析用户查询意图
 */
export function analyzeIntent(query: string): QueryIntent {
  const q = query.toLowerCase();

  if (/订单|销量|多少|统计|收入|卖出|库存/.test(q) && !/文案|回答|回复/.test(q)) {
    return 'data_query';
  }

  if (/小红书|文案|生成|写一|创作|发布/.test(q)) {
    return 'content_create';
  }

  if (/客户|退货|退款|怎么回|回复|客服/.test(q)) {
    return 'customer_service';
  }

  if (/查一|政策|说明|退换货|规定|找一下/.test(q)) {
    return 'knowledge_query';
  }

  return 'unknown';
}

/**
 * 获取商品数据（同步辅助函数，在浏览器模式下可用）
 */
function getProductsSync(): Product[] {
  try {
    // getProducts 在浏览器模式下返回空数组（同步），
    // 在 Tauri 模式下返回 Promise。
    // 这里使用同步方式处理兼容
    const result = getProducts({ limit: 50 });
    if (result instanceof Promise) {
      return []; // 异步情况先返回空，由调用者处理
    }
    return result as unknown as Product[];
  } catch {
    return [];
  }
}

/**
 * 处理数据查询类请求
 */
function handleDataQuery(query: string): AIResponse {
  const q = query.toLowerCase();
  let text = '';
  const sources: AIResponse['sources'] = [];

  if (/库存/.test(q)) {
    text = '当前库存情况：\n';
    try {
      const products = getProductsSync();
      const lowStock = products.filter(p => p.current_stock <= p.min_stock);
      const totalProducts = products.length;
      const totalStock = products.reduce((s, p) => s + p.current_stock, 0);
      text += `- 总商品数：${totalProducts}\n- 总库存量：${totalStock}\n- 库存预警：${lowStock.length} 个商品低于安全库存`;
      if (lowStock.length > 0) {
        text += '\n\n需要补货的商品：\n' + lowStock.slice(0, 10).map(p =>
          `  - ${p.name}（当前库存 ${p.current_stock}，预警值 ${p.min_stock}）`
        ).join('\n');
      }
    } catch {
      text += '无法获取库存数据，请确认数据已保存。';
    }
  } else if (/订单/.test(q) || /销量/.test(q) || /卖出/.test(q)) {
    text = '订单数据需要在桌面端完整运行后才能查询，请使用左侧"销售管理"查看详细订单信息。';
    sources.push({ type: 'order', title: '销售管理页面', reference: '/sales' });
  } else {
    text = '我可以在以下方面帮您：\n- 查询商品库存\n- 生成营销文案\n- 回答客户问题\n- 查找政策文档\n\n请具体描述您的需求。';
  }

  return { text, sources };
}

/**
 * 处理创作类请求
 */
function handleContentCreate(query: string): AIResponse {
  const q = query.toLowerCase();
  const sources: AIResponse['sources'] = [];

  let productName = '';
  const match = q.match(/[''"「」]?([^'"「」]+?)[''"」]?\s*(?:的|文案|推广|介绍)/);
  if (match) productName = match[1];

  let productInfo = '';
  if (productName) {
    try {
      const products = getProductsSync();
      const found = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
      if (found) {
        productInfo = `商品：${found.name}\n价格：¥${found.sell_price}${found.description ? `\n描述：${found.description}` : ''}`;
        sources.push({ type: 'product', title: found.name });
      }
    } catch {
      // ignore
    }
  }

  const priceMatch = productInfo.match(/价格：¥(\d+\.?\d*)/);
  const text = productInfo
    ? `【商品信息】\n${productInfo}\n\n【推荐文案】\n✨ 今天给大家安利一款超级好用的好物！\n\n🌟 【${productName}】\n\n💰 只要 ¥${priceMatch?.[1] || '??'}，性价比超高！\n\n✅ 品质保证，用过都说好\n📦 现货秒发，闪电配送\n💁 售后无忧，放心购买\n\n🔥 数量有限，先到先得！\n\n#好物推荐 #良心推荐`
    : `请告诉我您想推广的商品名称，我可以帮您生成营销文案。\n\n例如："帮我生成一条小红书文案，商品是土鸡蛋。"`;

  return { text, sources };
}

/**
 * 处理客服类请求
 */
function handleCustomerService(query: string): AIResponse {
  const sources: AIResponse['sources'] = [];

  const matched = matchQABestAnswer(query);
  if (matched) {
    sources.push({ type: 'qa', title: matched.question, reference: matched.answer });
    return {
      text: `【来自问答库的推荐回答】\n\n客户问：${matched.question}\n\n建议回复：${matched.answer}\n\n（此回答来自您的问答库，可在"问答库"中编辑或补充）`,
      sources,
    };
  }

  const knowledgeResults = searchKnowledge(query, 3);
  if (knowledgeResults.length > 0) {
    const doc = knowledgeResults[0];
    sources.push({ type: 'knowledge', title: doc.title });
    return {
      text: `在资料库中找到相关文档：\n\n📄 ${doc.title}\n\n建议参考此文档内容回复客户。可在"资料库"中查看完整文档。`,
      sources,
    };
  }

  return {
    text: `未在问答库和资料库中找到匹配的答案。\n\n建议：\n1. 前往"问答库"添加此问题的标准回答\n2. 前往"资料库"上传相关政策文档\n3. 或手动回复客户后，在问答库中记录此问题`,
    sources,
  };
}

/**
 * 处理知识查询类请求
 */
function handleKnowledgeQuery(query: string): AIResponse {
  const sources: AIResponse['sources'] = [];

  const qaMatch = matchQABestAnswer(query);
  if (qaMatch) {
    sources.push({ type: 'qa', title: qaMatch.question });
    return {
      text: `【问答库中找到相关信息】\n\n${qaMatch.question}\n${qaMatch.answer}`,
      sources,
    };
  }

  const knowledgeResults = searchKnowledge(query, 5);
  if (knowledgeResults.length > 0) {
    knowledgeResults.forEach(doc => {
      sources.push({ type: 'knowledge', title: doc.title });
    });
    const list = knowledgeResults.map((d, i) => `${i + 1}. ${d.title}`).join('\n');
    return {
      text: `在资料库中找到以下相关文档：\n\n${list}\n\n请前往"资料库"查看完整内容。`,
      sources,
    };
  }

  return {
    text: `未在资料库和问答库中找到相关文档。建议前往"资料库"或"问答库"添加相关内容。`,
    sources,
  };
}

/**
 * 主查询接口
 */
export function queryLightAI(userQuery: string): AIResponse {
  const intent = analyzeIntent(userQuery);

  switch (intent) {
    case 'data_query':
      return handleDataQuery(userQuery);
    case 'content_create':
      return handleContentCreate(userQuery);
    case 'customer_service':
      return handleCustomerService(userQuery);
    case 'knowledge_query':
      return handleKnowledgeQuery(userQuery);
    default:
      return {
        text: `您好！我是您的 ProClaw-Light AI 助手，可以帮您：

📊 数据查询
- "库存情况怎么样？"

✍️ 内容创作
- "帮我生成一条小红书文案，商品是土鸡蛋"

💁 客服辅助
- "客户问土鸡蛋能不能退货，帮我回复"

📚 知识查询
- "查一下我们店的退换货政策"`,
        sources: [],
      };
  }
}

/**
 * 获取 Light 版 AI 助手的初始问候消息
 */
export function getLightInitialMessage(): string {
  return `你好！我是 ProClaw-Light AI 助手 🎯

我可以帮你管理店铺的方方面面：

📊 数据查询 - 查库存、查订单
✍️ 内容创作 - 生成营销文案
💁 客服辅助 - 快速回复客户
📚 知识查询 - 查找政策文档

有什么可以帮你的吗？`;
}

/**
 * 获取 Light 版快捷指令
 */
export function getLightQuickCommands(): Array<{ label: string; command: string }> {
  return [
    { label: '📦 查库存', command: '查询库存情况' },
    { label: '✍️ 写文案', command: '帮我生成一条小红书文案，商品是土鸡蛋' },
    { label: '💁 客服参考', command: '客户问商品能不能退货，怎么回' },
    { label: '📚 查政策', command: '查一下退换货政策' },
  ];
}
