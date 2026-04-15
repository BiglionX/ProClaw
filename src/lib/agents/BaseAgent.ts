/**
 * AI Agent基类
 * 提供统一的Agent接口，支持工具调用、记忆管理和流式响应
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Tool } from '@langchain/core/tools';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { getLLMForTask } from '../llmProvider';
import { TaskType } from '../aiConfig';

export interface AgentConfig {
  taskType: TaskType;
  systemPrompt?: string;
  maxIterations?: number;
  enableMemory?: boolean;
  temperature?: number;
}

export interface AgentResponse {
  output: string;
  intermediateSteps?: Array<{
    action: string;
    observation: string;
  }>;
  metadata?: {
    tokensUsed?: number;
    executionTime?: number;
    toolCalls?: number;
  };
}

export interface AgentMemory {
  conversation: BaseMessage[];
  context: Record<string, any>;
}

/**
 * Agent基类
 * 所有专业Agent都应继承此类
 */
export abstract class BaseAgent {
  protected llm: BaseChatModel | null = null;
  protected tools: Tool[] = [];
  protected memory: AgentMemory = {
    conversation: [],
    context: {},
  };
  protected config: AgentConfig;
  protected systemPrompt: string;

  constructor(config: AgentConfig) {
    this.config = {
      maxIterations: 5,
      enableMemory: true,
      ...config,
    };
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * 初始化LLM（延迟加载）
   */
  protected async initializeLLM(): Promise<BaseChatModel> {
    if (!this.llm) {
      this.llm = await getLLMForTask(this.config.taskType);
    }
    return this.llm;
  }

  /**
   * 获取默认系统提示词
   * 子类应重写此方法
   */
  protected getDefaultSystemPrompt(): string {
    return '你是一个专业的AI助手。';
  }

  /**
   * 定义Agent可用的工具
   * 子类应重写此方法
   */
  protected defineTools(): Tool[] {
    return [];
  }

  /**
   * 执行Agent任务
   * @param query 用户查询
   * @param context 额外上下文信息
   */
  async execute(query: string, context?: Record<string, any>): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // 初始化LLM和工具
      const llm = await this.initializeLLM();
      this.tools = this.defineTools();

      // 更新上下文
      if (context) {
        this.memory.context = { ...this.memory.context, ...context };
      }

      // 构建消息历史
      const messages = this.buildMessages(query);

      // 调用LLM
      const response = await llm.invoke(messages);

      // 记录到记忆
      if (this.config.enableMemory) {
        this.addToMemory(query, response.content as string);
      }

      const executionTime = Date.now() - startTime;

      return {
        output: response.content as string,
        metadata: {
          executionTime,
          toolCalls: 0, // 简化实现，实际应统计工具调用次数
        },
      };
    } catch (error) {
      console.error(`Agent execution failed:`, error);
      throw new Error(
        `Agent执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 流式执行（支持实时输出）
   */
  async *executeStream(query: string, _context?: Record<string, any>): AsyncGenerator<string> {
    try {
      const llm = await this.initializeLLM();
      this.tools = this.defineTools();

      const messages = this.buildMessages(query);

      // 注意：LangChain的流式API
      const stream = await llm.stream(messages);

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.content as string;
        fullResponse += content;
        yield content;
      }

      // 记录到记忆
      if (this.config.enableMemory) {
        this.addToMemory(query, fullResponse);
      }
    } catch (error) {
      console.error(`Stream execution failed:`, error);
      throw error;
    }
  }

  /**
   * 构建消息历史
   */
  protected buildMessages(query: string): BaseMessage[] {
    const messages: BaseMessage[] = [
      new SystemMessage(this.systemPrompt),
    ];

    // 添加对话历史（如果启用记忆）
    if (this.config.enableMemory && this.memory.conversation.length > 0) {
      // 只保留最近的N轮对话，避免超出上下文限制
      const recentMessages = this.memory.conversation.slice(-10);
      messages.push(...recentMessages);
    }

    // 添加当前查询
    messages.push(new HumanMessage(query));

    return messages;
  }

  /**
   * 添加到记忆
   */
  protected addToMemory(userQuery: string, aiResponse: string): void {
    this.memory.conversation.push(new HumanMessage(userQuery));
    this.memory.conversation.push(new AIMessage(aiResponse));

    // 限制记忆长度
    if (this.memory.conversation.length > 20) {
      this.memory.conversation = this.memory.conversation.slice(-20);
    }
  }

  /**
   * 清空记忆
   */
  clearMemory(): void {
    this.memory = {
      conversation: [],
      context: {},
    };
  }

  /**
   * 获取记忆状态
   */
  getMemoryStatus(): {
    conversationLength: number;
    contextKeys: string[];
  } {
    return {
      conversationLength: this.memory.conversation.length,
      contextKeys: Object.keys(this.memory.context),
    };
  }

  /**
   * 重置Agent状态
   */
  reset(): void {
    this.clearMemory();
    this.llm = null;
  }
}
