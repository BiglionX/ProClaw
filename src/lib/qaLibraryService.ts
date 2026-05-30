/**
 * ProClaw-Light 问答库服务
 * 商户维护的客户常见问题与标准回答知识库
 */

export type QACategory = 'product_inquiry' | 'delivery_return' | 'after_sales' | 'promotion' | 'other';

export const QA_CATEGORY_LABELS: Record<QACategory, string> = {
  product_inquiry: '商品咨询',
  delivery_return: '配送退换',
  after_sales: '售后服务',
  promotion: '促销活动',
  other: '其他',
};

export const QA_CATEGORY_LIST: { value: QACategory; label: string }[] = [
  { value: 'product_inquiry', label: '商品咨询' },
  { value: 'delivery_return', label: '配送退换' },
  { value: 'after_sales', label: '售后服务' },
  { value: 'promotion', label: '促销活动' },
  { value: 'other', label: '其他' },
];

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  category: QACategory;
  tags: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQAPairInput {
  question: string;
  answer: string;
  category?: QACategory;
  tags?: string[];
}

const STORAGE_KEY = 'proclaw-light-qa-library';

function readAll(): QAPair[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAll(items: QAPair[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ===== 公开 API =====

export function getQAPairs(options?: {
  search?: string;
  category?: QACategory;
  active_only?: boolean;
}): QAPair[] {
  let items = readAll();
  if (options?.active_only) {
    items = items.filter(q => q.is_active);
  }
  if (options?.category) {
    items = items.filter(q => q.category === options.category);
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    items = items.filter(
      item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }
  return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getQAPairById(id: string): QAPair | undefined {
  return readAll().find(q => q.id === id);
}

export function createQAPair(input: CreateQAPairInput): QAPair {
  const items = readAll();
  const now = new Date().toISOString();
  const newItem: QAPair = {
    id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    question: input.question,
    answer: input.answer,
    category: input.category || 'other',
    tags: input.tags || [],
    is_active: true,
    usage_count: 0,
    created_at: now,
    updated_at: now,
  };
  items.unshift(newItem);
  saveAll(items);
  return newItem;
}

export function updateQAPair(id: string, updates: Partial<QAPair>): boolean {
  const items = readAll();
  const index = items.findIndex(q => q.id === id);
  if (index === -1) return false;
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
  saveAll(items);
  return true;
}

export function deleteQAPair(id: string): boolean {
  const items = readAll();
  const filtered = items.filter(q => q.id !== id);
  if (filtered.length === items.length) return false;
  saveAll(filtered);
  return true;
}

export function incrementQAPairUsage(id: string): void {
  const items = readAll();
  const index = items.findIndex(q => q.id === id);
  if (index !== -1) {
    items[index].usage_count += 1;
    items[index].updated_at = new Date().toISOString();
    saveAll(items);
  }
}

export function getQAStats() {
  const items = readAll();
  return {
    total: items.length,
    active: items.filter(q => q.is_active).length,
    byCategory: QA_CATEGORY_LIST.map(({ value, label }) => ({
      category: value,
      label,
      count: items.filter(q => q.category === value).length,
    })),
    totalUsage: items.reduce((s, q) => s + q.usage_count, 0),
  };
}

/**
 * 导出为团购平台/小程序快捷回复模板
 */
export function exportQATemplate(): string {
  const items = readAll().filter(q => q.is_active);
  const lines: string[] = ['# 客户问答快捷回复模板', `# 导出时间: ${new Date().toLocaleString()}`, `# 共 ${items.length} 条问答`, ''];
  
  const grouped: Record<string, QAPair[]> = {};
  for (const item of items) {
    const cat = QA_CATEGORY_LABELS[item.category];
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  for (const [category, pairs] of Object.entries(grouped)) {
    lines.push(`## ${category}`);
    lines.push('');
    for (const pair of pairs) {
      lines.push(`Q: ${pair.question}`);
      lines.push(`A: ${pair.answer}`);
      if (pair.tags && pair.tags.length > 0) {
        lines.push(`标签: ${pair.tags.join(', ')}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

/**
 * 与 AI 助手联动：根据用户问题匹配最佳回答
 */
export function matchQABestAnswer(userQuestion: string): QAPair | null {
  const items = readAll().filter(q => q.is_active);
  if (items.length === 0) return null;

  const q = userQuestion.toLowerCase();
  const scored = items.map(item => {
    let score = 0;
    // 关键词匹配评分
    const qKeywords = q.split(/[\s,，。？！?！]+/).filter(Boolean);
    const questionText = item.question.toLowerCase();
    const answerText = item.answer.toLowerCase();
    
    for (const kw of qKeywords) {
      if (kw.length < 2) continue;
      if (questionText.includes(kw)) score += 3;
      if (answerText.includes(kw)) score += 1;
    }
    // 标签匹配加分
    for (const tag of item.tags) {
      if (q.includes(tag.toLowerCase())) score += 2;
    }
    // 使用频率加分（热度）
    score += Math.min(item.usage_count * 0.1, 2);
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score > 0) {
    incrementQAPairUsage(scored[0].item.id);
    return scored[0].item;
  }
  return null;
}
