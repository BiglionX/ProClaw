/**
 * ProClaw-Light 资料库服务
 * 商户内部知识库，存储业务相关文档和参考资料
 */

export type KnowledgeCategory = 'product_manual' | 'quotation' | 'delivery_policy' | 'marketing_template' | 'contract' | 'certificate';

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  product_manual: '产品说明书',
  quotation: '报价单',
  delivery_policy: '配送政策',
  marketing_template: '营销模板',
  contract: '合同范本',
  certificate: '证照资质',
};

export const KNOWLEDGE_CATEGORY_LIST: { value: KnowledgeCategory; label: string }[] = [
  { value: 'product_manual', label: '产品说明书' },
  { value: 'quotation', label: '报价单' },
  { value: 'delivery_policy', label: '配送政策' },
  { value: 'marketing_template', label: '营销模板' },
  { value: 'contract', label: '合同范本' },
  { value: 'certificate', label: '证照资质' },
];

export interface KnowledgeDocument {
  id: string;
  title: string;
  file_type: 'pdf' | 'word' | 'excel' | 'image' | 'text';
  file_path?: string;
  data_url?: string;         // base64 数据（浏览器模式）
  category: KnowledgeCategory;
  content_text?: string;     // 提取的文本内容，用于全文搜索
  tags: string[];
  is_active: boolean;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeInput {
  title: string;
  file_type: KnowledgeDocument['file_type'];
  data_url?: string;
  category?: KnowledgeCategory;
  content_text?: string;
  tags?: string[];
  file_size?: number;
}

const STORAGE_KEY = 'proclaw-light-knowledge-base';

function readAll(): KnowledgeDocument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAll(items: KnowledgeDocument[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ===== 公开 API =====

export function getKnowledgeDocuments(options?: {
  search?: string;
  category?: KnowledgeCategory;
  active_only?: boolean;
}): KnowledgeDocument[] {
  let items = readAll();
  if (options?.active_only) {
    items = items.filter(d => d.is_active);
  }
  if (options?.category) {
    items = items.filter(d => d.category === options.category);
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    items = items.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        (d.content_text && d.content_text.toLowerCase().includes(q)) ||
        d.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getKnowledgeDocumentById(id: string): KnowledgeDocument | undefined {
  return readAll().find(d => d.id === id);
}

export function createKnowledgeDocument(input: CreateKnowledgeInput): KnowledgeDocument {
  const items = readAll();
  const now = new Date().toISOString();
  const newDoc: KnowledgeDocument = {
    id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: input.title,
    file_type: input.file_type,
    data_url: input.data_url,
    category: input.category || 'delivery_policy',
    content_text: input.content_text,
    tags: input.tags || [],
    is_active: true,
    file_size: input.file_size || 0,
    created_at: now,
    updated_at: now,
  };
  items.unshift(newDoc);
  saveAll(items);
  return newDoc;
}

export function updateKnowledgeDocument(id: string, updates: Partial<KnowledgeDocument>): boolean {
  const items = readAll();
  const index = items.findIndex(d => d.id === id);
  if (index === -1) return false;
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
  saveAll(items);
  return true;
}

export function deleteKnowledgeDocument(id: string): boolean {
  const items = readAll();
  const filtered = items.filter(d => d.id !== id);
  if (filtered.length === items.length) return false;
  saveAll(filtered);
  return true;
}

export function getKnowledgeStats() {
  const items = readAll();
  const totalSize = items.reduce((s, d) => s + d.file_size, 0);
  return {
    total: items.length,
    active: items.filter(d => d.is_active).length,
    byCategory: KNOWLEDGE_CATEGORY_LIST.map(({ value, label }) => ({
      category: value,
      label,
      count: items.filter(d => d.category === value).length,
    })),
    totalSize,
  };
}

/**
 * 全文搜索（用于 AI 助手检索）
 */
export function searchKnowledge(query: string, limit: number = 5): KnowledgeDocument[] {
  return getKnowledgeDocuments({ search: query, active_only: true }).slice(0, limit);
}

/**
 * 从上传的文件内容中提取可搜索文本
 */
export function extractTextContent(dataUrl: string, fileType: string): string {
  if (fileType === 'text' || fileType === 'txt') {
    try {
      const base64 = dataUrl.split(',')[1];
      return atob(base64);
    } catch {
      return '';
    }
  }
  // 对于非文本文件，返回文件名作为搜索内容
  return '';
}

export function formatKnowledgeFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function detectFileType(filename: string): KnowledgeDocument['file_type'] {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['txt', 'md'].includes(ext)) return 'text';
  return 'text';
}
