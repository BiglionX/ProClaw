/**
 * AI 知识库智能问答（任务 #4）
 *
 * 检索相关知识文档 + LLM 生成结构化答案
 * 复用 [llmProvider.ts] 的 LLM 路由 + [aiTools.ts] 的洞察提取
 *
 * @example
 * const answer = await knowledgeQA.ask('退换货政策是什么？', docs);
 */

import { getLLMForTask } from './llmProvider';
import { extractInsights, generatePrompt, formatBusinessData, estimateTokens } from './aiTools';
import type { KnowledgeDocument } from './knowledgeBaseService';
import { isTauri } from './tauri';

// ==================== 类型定义 ====================

export interface KnowledgeAnswer {
  /** 答案文本 */
  text: string;
  /** 关键发现 */
  keyFindings: string[];
  /** 建议 */
  recommendations: string[];
  /** 置信度 (0-1) */
  confidence: number;
  /** 引用的来源文档 ID 列表 */
  citedDocIds: string[];
  /** 引用的来源文档详情 */
  citations: Array<{
    id: string;
    title: string;
    snippet: string;
    relevance: number;
  }>;
  /** 使用的 LLM 模型 */
  model?: string;
  /** 耗时（毫秒） */
  durationMs: number;
}

interface RetrievalMatch {
  doc: KnowledgeDocument;
  score: number;
  matchedSnippets: string[];
}

const MAX_CONTEXT_TOKENS = 3000;
const TOP_K = 3;

// ==================== 文档检索 ====================

/**
 * 简单的 TF-IDF + 关键词匹配检索（无向量数据库）
 * 适合小规模知识库（< 1000 文档）
 */
function retrieveRelevantDocs(
  question: string,
  documents: KnowledgeDocument[],
  topK = TOP_K
): RetrievalMatch[] {
  if (documents.length === 0) return [];

  // 中文分词（简化版：按字符 + 关键词）
  const queryTokens = tokenize(question);
  if (queryTokens.length === 0) return [];

  // 计算每个文档的相关性分数
  const matches: RetrievalMatch[] = documents
    .map(doc => {
      const docText = `${doc.title} ${doc.content_text || ''} ${(doc.tags || []).join(' ')}`;
      const docTokens = tokenize(docText);
      const docSet = new Set(docTokens);

      // 关键词命中数
      let hitCount = 0;
      const matchedSnippets: string[] = [];
      for (const token of queryTokens) {
        if (docSet.has(token)) {
          hitCount++;
        }
      }

      // 标题加权（标题命中权重更高）
      const titleTokens = tokenize(doc.title);
      const titleHit = queryTokens.filter(t => titleTokens.includes(t)).length;
      const titleScore = titleHit * 3;

      // 标签命中
      const tagHit = (doc.tags || []).filter(tag =>
        queryTokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))
      ).length;
      const tagScore = tagHit * 2;

      const score = hitCount + titleScore + tagScore;

      // 提取匹配的段落片段
      if (doc.content_text && hitCount > 0) {
        const sentences = doc.content_text.split(/[。！？.!?\n]/).filter(s => s.trim());
        for (const sentence of sentences) {
          if (queryTokens.some(t => sentence.includes(t)) && sentence.length < 200) {
            matchedSnippets.push(sentence.trim());
            if (matchedSnippets.length >= 2) break;
          }
        }
      }

      return {
        doc,
        score,
        matchedSnippets: matchedSnippets.length > 0 ? matchedSnippets : [doc.title],
      };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return matches;
}

/** 简化分词（中英文混合） */
function tokenize(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];

  // 1. 英文单词
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  tokens.push(...englishWords.map(w => w.toLowerCase()));

  // 2. 数字
  const numbers = text.match(/\d+/g) || [];
  tokens.push(...numbers);

  // 3. 中文（bigram + 单字）
  const chineseChars = text.match(/[\u4e00-\u9fa5]+/g) || [];
  for (const segment of chineseChars) {
    // Bigram（2字组合）作为 token
    for (let i = 0; i < segment.length - 1; i++) {
      tokens.push(segment.substring(i, i + 2));
    }
    // 单字
    for (let i = 0; i < segment.length; i++) {
      tokens.push(segment.charAt(i));
    }
  }

  // 4. 停用词
  const stopWords = new Set([
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '那', '里', '吗', '呢', '啊', '吧', '什么', '怎么', '为什么',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  ]);

  return [...new Set(tokens)].filter(t => t.length > 0 && !stopWords.has(t));
}

// ==================== Prompt 构建 ====================

function buildQAPrompt(question: string, matches: RetrievalMatch[]): string {
  const contextDocs = matches.map((m, i) => {
    const content = m.matchedSnippets.join('\n') || m.doc.title;
    return `[${i + 1}] 文档标题：${m.doc.title}\n分类：${m.doc.category}\n相关内容：\n${content}`;
  });

  const context = contextDocs.join('\n\n---\n\n');

  return `你是 ProClaw 商务秘书的"知识库问答"模块。

## 任务
基于以下知识库文档回答老板的问题。请：
1. 仅基于提供的文档内容回答
2. 引用具体文档编号（如 [1]、[2]）
3. 如果文档中没有相关信息，请坦诚告知
4. 回答简洁、专业、可执行

## 知识库文档
${context}

## 老板的问题
${question}

## 输出要求（JSON 格式）
{
  "answer": "对老板问题的回答（带 [1][2] 引用）",
  "keyFindings": ["关键发现1", "关键发现2"],
  "recommendations": ["建议1", "建议2"],
  "confidence": 0.0-1.0
}`;
}

// ==================== 主服务 ====================

export const knowledgeQA = {
  /**
   * 向知识库提问
   * @param question 问题
   * @param documents 知识库文档列表
   */
  async ask(question: string, documents: KnowledgeDocument[]): Promise<KnowledgeAnswer> {
    const t0 = performance.now();

    // 1. 检索相关文档
    const matches = retrieveRelevantDocs(question, documents);

    // 2. 无相关文档
    if (matches.length === 0) {
      return {
        text: `抱歉，知识库中没有找到与"${question}"相关的内容。建议您：\n1. 上传相关文档到资料库\n2. 换个关键词提问\n3. 直接咨询小 Pro 商务秘书`,
        keyFindings: [],
        recommendations: [
          '上传更多业务相关文档',
          '使用更具体的关键词',
        ],
        confidence: 0,
        citedDocIds: [],
        citations: [],
        durationMs: performance.now() - t0,
      };
    }

    // 3. 构造 prompt
    const prompt = buildQAPrompt(question, matches);

    // 4. 截断（避免超 token 限制）
    const promptTokens = estimateTokens(prompt);
    const truncatedPrompt = promptTokens > MAX_CONTEXT_TOKENS
      ? prompt.substring(0, Math.floor(prompt.length * (MAX_CONTEXT_TOKENS / promptTokens)))
      : prompt;

    // 5. 调用 LLM
    try {
      const llm = getLLMForTask('business_insight');
      const response = await llm.invoke(truncatedPrompt);
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      // 6. 解析响应
      const parsed = tryParseJsonResponse(content);

      return {
        text: parsed.answer || content,
        keyFindings: parsed.keyFindings || [],
        recommendations: parsed.recommendations || [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        citedDocIds: matches.map(m => m.doc.id),
        citations: matches.map(m => ({
          id: m.doc.id,
          title: m.doc.title,
          snippet: m.matchedSnippets[0] || m.doc.title,
          relevance: m.score / (matches[0].score || 1), // 归一化
        })),
        model: llm._llmType() || 'unknown',
        durationMs: performance.now() - t0,
      };
    } catch (err) {
      // LLM 调用失败时的降级方案：返回原始检索结果
      return {
        text: formatFallbackAnswer(question, matches),
        keyFindings: matches.map(m => m.doc.title),
        recommendations: matches.slice(0, 2).map(m => `查看「${m.doc.title}」了解更多`),
        confidence: 0.3,
        citedDocIds: matches.map(m => m.doc.id),
        citations: matches.map(m => ({
          id: m.doc.id,
          title: m.doc.title,
          snippet: m.matchedSnippets[0] || m.doc.title,
          relevance: m.score / (matches[0].score || 1),
        })),
        durationMs: performance.now() - t0,
      };
    }
  },

  /**
   * 异步流式问答（实验性）
   * 返回 AsyncGenerator，逐步产出 token
   */
  async *askStream(
    question: string,
    documents: KnowledgeDocument[]
  ): AsyncGenerator<string, KnowledgeAnswer, void> {
    const t0 = performance.now();
    const matches = retrieveRelevantDocs(question, documents);

    if (matches.length === 0) {
      yield `抱歉，知识库中没有找到与"${question}"相关的内容。`;
      return {
        text: '',
        keyFindings: [],
        recommendations: [],
        confidence: 0,
        citedDocIds: [],
        citations: [],
        durationMs: performance.now() - t0,
      };
    }

    const prompt = buildQAPrompt(question, matches);
    const llm = getLLMForTask('business_insight');

    try {
      const stream = await llm.stream(prompt);
      let accumulated = '';
      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        accumulated += text;
        yield text;
      }

      const parsed = tryParseJsonResponse(accumulated);
      return {
        text: parsed.answer || accumulated,
        keyFindings: parsed.keyFindings || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.7,
        citedDocIds: matches.map(m => m.doc.id),
        citations: matches.map(m => ({
          id: m.doc.id,
          title: m.doc.title,
          snippet: m.matchedSnippets[0] || m.doc.title,
          relevance: m.score / (matches[0].score || 1),
        })),
        model: llm._llmType() || 'unknown',
        durationMs: performance.now() - t0,
      };
    } catch (err) {
      yield formatFallbackAnswer(question, matches);
      return {
        text: formatFallbackAnswer(question, matches),
        keyFindings: [],
        recommendations: [],
        confidence: 0.3,
        citedDocIds: matches.map(m => m.doc.id),
        citations: matches.map(m => ({
          id: m.doc.id,
          title: m.doc.title,
          snippet: m.matchedSnippets[0] || m.doc.title,
          relevance: 0.5,
        })),
        durationMs: performance.now() - t0,
      };
    }
  },
};

// ==================== 工具函数 ====================

function tryParseJsonResponse(content: string): {
  answer?: string;
  keyFindings?: string[];
  recommendations?: string[];
  confidence?: number;
} {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        /* ignore */
      }
    }

    // 降级：返回原始文本
    return { answer: content };
  }
}

function formatFallbackAnswer(question: string, matches: RetrievalMatch[]): string {
  const lines = [
    `AI 服务暂时不可用，但知识库中找到了以下相关文档：`,
    '',
    ...matches.map((m, i) => `${i + 1}. **${m.doc.title}**${m.matchedSnippets[0] ? `\n   ${m.matchedSnippets[0]}` : ''}`),
    '',
    `建议您点击上方文档查看完整内容，或稍后重试 AI 问答。`,
  ];
  return lines.join('\n');
}

export default knowledgeQA;
