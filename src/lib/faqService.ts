/**
 * FAQ 常见问题管理服务
 * 支持自动收集、智能分类、人工审核和同步到营销网站
 */

// 类型定义
export interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface FAQQuestion {
  id: string;
  category_id?: string;
  question: string;
  answer: string;
  source_type: 'manual' | 'auto_collected' | 'ai_suggested';
  source_query?: string;
  user_id?: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  reviewed_by?: string;
  reviewed_at?: string;
  priority: number;
  is_featured: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface UserQuery {
  id: string;
  user_id?: string;
  query_text: string;
  query_type: 'chat' | 'search' | 'command';
  context?: Record<string, any>;
  is_answered: boolean;
  matched_faq_id?: string;
  confidence_score?: number;
  occurrence_count: number;
  created_at: string;
}

const FAQ_CATEGORIES_KEY = 'proclaw-faq-categories';
const FAQ_QUESTIONS_KEY = 'proclaw-faq-questions';
const USER_QUERIES_KEY = 'proclaw-user-queries';

// 初始化默认分类
function initializeDefaultCategories(): FAQCategory[] {
  const categories: FAQCategory[] = [
    {
      id: 'cat-1',
      name: '入门指南',
      slug: 'getting-started',
      description: '安装、配置和基本使用',
      sort_order: 1,
      is_active: true,
    },
    {
      id: 'cat-2',
      name: 'AI 功能',
      slug: 'ai-features',
      description: 'AI智能体和大模型相关',
      sort_order: 2,
      is_active: true,
    },
    {
      id: 'cat-3',
      name: '数据管理',
      slug: 'data-management',
      description: '产品、库存、销售数据管理',
      sort_order: 3,
      is_active: true,
    },
    {
      id: 'cat-4',
      name: '账户与订阅',
      slug: 'account-subscription',
      description: '账户管理和Token订阅',
      sort_order: 4,
      is_active: true,
    },
    {
      id: 'cat-5',
      name: '故障排除',
      slug: 'troubleshooting',
      description: '常见问题和解决方案',
      sort_order: 5,
      is_active: true,
    },
  ];
  
  localStorage.setItem(FAQ_CATEGORIES_KEY, JSON.stringify(categories));
  return categories;
}

// 获取分类
export function getFAQCategories(): FAQCategory[] {
  try {
    const data = localStorage.getItem(FAQ_CATEGORIES_KEY);
    if (!data) {
      return initializeDefaultCategories();
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('[FAQ] Failed to load categories:', error);
    return [];
  }
}

// 获取已发布的FAQ
export function getPublishedFAQs(categorySlug?: string): FAQQuestion[] {
  try {
    const questions = getFAQQuestions();
    const published = questions.filter(q => q.status === 'published');
    
    if (categorySlug) {
      const category = getFAQCategories().find(c => c.slug === categorySlug);
      if (category) {
        return published.filter(q => q.category_id === category.id);
      }
    }
    
    return published.sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error('[FAQ] Failed to get published FAQs:', error);
    return [];
  }
}

// 获取待审核的FAQ
export function getPendingFAQs(): FAQQuestion[] {
  try {
    const questions = getFAQQuestions();
    return questions
      .filter(q => q.status === 'pending_review')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('[FAQ] Failed to get pending FAQs:', error);
    return [];
  }
}

// 获取所有FAQ问题
function getFAQQuestions(): FAQQuestion[] {
  try {
    const data = localStorage.getItem(FAQ_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[FAQ] Failed to load questions:', error);
    return [];
  }
}

// 保存FAQ问题
function saveFAQQuestions(questions: FAQQuestion[]): void {
  localStorage.setItem(FAQ_QUESTIONS_KEY, JSON.stringify(questions));
}

// 记录用户查询
export function recordUserQuery(
  queryText: string,
  options?: {
    userId?: string;
    queryType?: 'chat' | 'search' | 'command';
    context?: Record<string, any>;
    isAnswered?: boolean;
  }
): void {
  try {
    const queries = getUserQueries();
    
    // 检查是否已有相似查询
    const existingIndex = queries.findIndex(q => 
      q.query_text.toLowerCase() === queryText.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // 更新出现次数
      queries[existingIndex].occurrence_count += 1;
      queries[existingIndex].created_at = new Date().toISOString();
    } else {
      // 插入新查询
      queries.unshift({
        id: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: options?.userId,
        query_text: queryText,
        query_type: options?.queryType || 'chat',
        context: options?.context,
        is_answered: options?.isAnswered || false,
        occurrence_count: 1,
        created_at: new Date().toISOString(),
      });
    }
    
    // 限制存储数量（保留最近500条）
    if (queries.length > 500) {
      queries.length = 500;
    }
    
    localStorage.setItem(USER_QUERIES_KEY, JSON.stringify(queries));
  } catch (error) {
    console.error('[FAQ] Failed to record user query:', error);
  }
}

// 获取用户查询
function getUserQueries(): UserQuery[] {
  try {
    const data = localStorage.getItem(USER_QUERIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[FAQ] Failed to load queries:', error);
    return [];
  }
}

// 生成FAQ建议（基于高频查询）
export function generateFAQSuggestions(limit: number = 10): Array<{
  query_text: string;
  occurrence_count: number;
  suggested_category?: string;
}> {
  try {
    const queries = getUserQueries();
    
    // 获取未回答的高频查询（至少出现3次）
    const frequentQueries = queries
      .filter(q => !q.is_answered && q.occurrence_count >= 3)
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, limit);
    
    return frequentQueries.map(q => ({
      query_text: q.query_text,
      occurrence_count: q.occurrence_count,
      suggested_category: suggestCategory(q.query_text),
    }));
  } catch (error) {
    console.error('[FAQ] Failed to generate suggestions:', error);
    return [];
  }
}

// 根据查询内容建议分类
function suggestCategory(queryText: string): string {
  const text = queryText.toLowerCase();
  
  if (text.includes('安装') || text.includes('配置') || text.includes('开始')) {
    return 'getting-started';
  }
  if (text.includes('ai') || text.includes('模型') || text.includes('api')) {
    return 'ai-features';
  }
  if (text.includes('产品') || text.includes('库存') || text.includes('销售')) {
    return 'data-management';
  }
  if (text.includes('账户') || text.includes('付费') || text.includes('token')) {
    return 'account-subscription';
  }
  if (text.includes('错误') || text.includes('失败') || text.includes('问题')) {
    return 'troubleshooting';
  }
  
  return 'getting-started';
}

// 创建FAQ问题
export function createFAQQuestion(
  question: string,
  answer: string,
  options?: {
    categoryId?: string;
    sourceType?: 'manual' | 'auto_collected' | 'ai_suggested';
    sourceQuery?: string;
    userId?: string;
    tags?: string[];
  }
): FAQQuestion | null {
  try {
    const questions = getFAQQuestions();
    
    const newQuestion: FAQQuestion = {
      id: `faq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question,
      answer,
      category_id: options?.categoryId,
      source_type: options?.sourceType || 'manual',
      source_query: options?.sourceQuery,
      user_id: options?.userId,
      status: 'pending_review',
      view_count: 0,
      helpful_count: 0,
      not_helpful_count: 0,
      priority: 0,
      is_featured: false,
      tags: options?.tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    questions.unshift(newQuestion);
    saveFAQQuestions(questions);
    
    return newQuestion;
  } catch (error) {
    console.error('[FAQ] Failed to create question:', error);
    return null;
  }
}

// 审核FAQ问题
export function reviewFAQQuestion(
  questionId: string,
  status: 'published' | 'archived',
  reviewerId?: string
): boolean {
  try {
    const questions = getFAQQuestions();
    const index = questions.findIndex(q => q.id === questionId);
    
    if (index === -1) return false;
    
    questions[index].status = status;
    questions[index].reviewed_by = reviewerId;
    questions[index].reviewed_at = new Date().toISOString();
    questions[index].updated_at = new Date().toISOString();
    
    saveFAQQuestions(questions);
    return true;
  } catch (error) {
    console.error('[FAQ] Failed to review question:', error);
    return false;
  }
}

// 更新FAQ问题
export function updateFAQQuestion(
  questionId: string,
  updates: Partial<FAQQuestion>
): boolean {
  try {
    const questions = getFAQQuestions();
    const index = questions.findIndex(q => q.id === questionId);
    
    if (index === -1) return false;
    
    questions[index] = {
      ...questions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    saveFAQQuestions(questions);
    return true;
  } catch (error) {
    console.error('[FAQ] Failed to update question:', error);
    return false;
  }
}

// 删除FAQ问题
export function deleteFAQQuestion(questionId: string): boolean {
  try {
    const questions = getFAQQuestions();
    const filtered = questions.filter(q => q.id !== questionId);
    saveFAQQuestions(filtered);
    return true;
  } catch (error) {
    console.error('[FAQ] Failed to delete question:', error);
    return false;
  }
}

// 提交FAQ反馈
export function submitFAQFeedback(
  questionId: string,
  isHelpful: boolean,
  _userId?: string
): boolean {
  try {
    const questions = getFAQQuestions();
    const index = questions.findIndex(q => q.id === questionId);
    
    if (index === -1) return false;
    
    if (isHelpful) {
      questions[index].helpful_count += 1;
    } else {
      questions[index].not_helpful_count += 1;
    }
    
    questions[index].updated_at = new Date().toISOString();
    saveFAQQuestions(questions);
    
    return true;
  } catch (error) {
    console.error('[FAQ] Failed to submit feedback:', error);
    return false;
  }
}

// 增加FAQ查看次数
export function incrementFAQViewCount(questionId: string): void {
  try {
    const questions = getFAQQuestions();
    const index = questions.findIndex(q => q.id === questionId);
    
    if (index !== -1) {
      questions[index].view_count += 1;
      questions[index].updated_at = new Date().toISOString();
      saveFAQQuestions(questions);
    }
  } catch (error) {
    console.error('[FAQ] Failed to increment view count:', error);
  }
}

// 获取FAQ统计数据
export function getFAQStats() {
  try {
    const questions = getFAQQuestions();
    
    const totalQuestions = questions.length;
    const publishedQuestions = questions.filter(q => q.status === 'published').length;
    const pendingReview = questions.filter(q => q.status === 'pending_review').length;
    const autoCollected = questions.filter(q => q.source_type === 'auto_collected').length;
    const totalViews = questions.reduce((sum, q) => sum + q.view_count, 0);
    
    const totalHelpful = questions.reduce((sum, q) => sum + q.helpful_count, 0);
    const totalNotHelpful = questions.reduce((sum, q) => sum + q.not_helpful_count, 0);
    const avgHelpfulness = totalHelpful + totalNotHelpful > 0
      ? (totalHelpful / (totalHelpful + totalNotHelpful)) * 100
      : 0;
    
    const topQuestions = questions
      .filter(q => q.status === 'published')
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 10);
    
    return {
      totalQuestions,
      publishedQuestions,
      pendingReview,
      autoCollected,
      totalViews,
      avgHelpfulness,
      topQuestions,
    };
  } catch (error) {
    console.error('[FAQ] Failed to get stats:', error);
    return {
      totalQuestions: 0,
      publishedQuestions: 0,
      pendingReview: 0,
      autoCollected: 0,
      totalViews: 0,
      avgHelpfulness: 0,
      topQuestions: [],
    };
  }
}

// 搜索FAQ
export function searchFAQs(searchTerm: string): FAQQuestion[] {
  try {
    const questions = getFAQQuestions();
    const term = searchTerm.toLowerCase();
    
    return questions
      .filter(q => 
        q.status === 'published' &&
        (q.question.toLowerCase().includes(term) || 
         q.answer.toLowerCase().includes(term))
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20);
  } catch (error) {
    console.error('[FAQ] Failed to search FAQs:', error);
    return [];
  }
}

// 导出FAQ为JSON（用于同步到营销网站）
export function exportFAQsForMarketingSite() {
  try {
    const categories = getFAQCategories();
    const questions = getPublishedFAQs();
    
    const faqData = categories.map(category => ({
      category: {
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      questions: questions
        .filter(q => q.category_id === category.id)
        .map(q => ({
          question: q.question,
          answer: q.answer,
          tags: q.tags,
          is_featured: q.is_featured,
        })),
    }));
    
    return {
      generated_at: new Date().toISOString(),
      total_categories: categories.length,
      total_questions: questions.length,
      faqs: faqData,
    };
  } catch (error) {
    console.error('[FAQ] Failed to export FAQs:', error);
    return null;
  }
}

// 自动从高频查询生成FAQ草稿
export function autoGenerateFAQFromQueries(): number {
  try {
    const suggestions = generateFAQSuggestions(20);
    let createdCount = 0;
    
    for (const suggestion of suggestions) {
      // 检查是否已存在类似问题
      const existing = searchFAQs(suggestion.query_text);
      
      if (existing.length === 0) {
        // 创建新的FAQ草稿
        const category = getFAQCategories().find(c => c.slug === suggestion.suggested_category);
        
        createFAQQuestion(
          suggestion.query_text,
          '【待完善】请编辑此答案...',
          {
            categoryId: category?.id,
            sourceType: 'auto_collected',
            sourceQuery: suggestion.query_text,
            tags: [suggestion.suggested_category || 'general'],
          }
        );
        
        createdCount++;
      }
    }
    
    return createdCount;
  } catch (error) {
    console.error('[FAQ] Failed to auto-generate FAQs:', error);
    return 0;
  }
}
