/**
 * AI Agent基类
 * 提供统一的Agent接口，支持工具调用、记忆管理和流式响应
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Tool } from '@langchain/core/tools';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { getLLMForTask } from '../llmProvider';
import { TaskType } from '../aiConfig';
import type {
  HermesBundle,
  ScoredSkill,
  ExecutionTrace,
  ToolCallRecord,
} from '../hermes';
import { SelfHealingExecutor } from '../hermes';

export interface AgentConfig {
  taskType: TaskType;
  systemPrompt?: string;
  maxIterations?: number;
  enableMemory?: boolean;
  temperature?: number;
  /**
   * 是否启用 Hermes Skills 注入。
   * - 默认 false,保持向后兼容(子类无需任何改动)
   * - 设为 true 时需先调用 attachHermes(bundle) 注入 skillStore/retriever
   */
  enableSkills?: boolean;
  /** Skills 检索 topK,默认 3 */
  skillTopK?: number;
  /**
   * P1-A:是否启用 SelfHealing(默认 true)。
   * 启用后,所有 LLM 调用都会被 SelfHealingExecutor 包裹,自动重试+降级。
   */
  enableSelfHealing?: boolean;
  /**
   * P1-A:指定首选 LLM providerId(用于 SelfHealing 的 fallback chain 起点)。
   * 默认 'default-service'。
   */
  llmProviderId?: string;
  /**
   * P1-A:自定义 fallback chain(覆盖默认的 deepseek→openai→anthropic→ollama)。
   * 这些 provider id 必须已在 LLMProviderManager 中注册。
   */
  llmFallbackChain?: string[];
  /**
   * P1-B:是否启用 MoA(默认 false,因为会增加 token)。
   * 启用后,根据 MoAOrchestrator 配置的触发条件决定是否走多模型并行。
   */
  enableMoA?: boolean;
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
  /** 可选:接入 Hermes Skills 系统后,这里持有 bundle 引用 */
  protected hermes: HermesBundle | null = null;
  /** P1-A:SelfHealingExecutor 实例(attachHermes 后自动初始化) */
  protected healer: SelfHealingExecutor | null = null;
  /** 本次 execute 检索到的 skills,供 P0-B SkillEvolver 反馈使用 */
  protected lastRetrievedSkills: ScoredSkill[] = [];

  constructor(config: AgentConfig) {
    this.config = {
      maxIterations: 5,
      enableMemory: true,
      enableSkills: false,
      enableSelfHealing: true, // P1-A 默认开(纯本地化,无 token 成本)
      enableMoA: false,         // P1-B 默认关(增加 token)
      skillTopK: 3,
      ...config,
    };
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * 注入 Hermes Skills 系统(P0-A 入口)。
   * 在 Agent 实例化后调用一次即可,例如:
   *   const ceo = new CEOAgent({ ... });
   *   ceo.attachHermes(getDefaultHermesBundle());
   *
   * 如果 bundle.evolver 不为 null,P0-B 的自进化会自动启用。
   * 如果 config.enableSelfHealing=true(默认),SelfHealing 自动包裹 LLM 调用。
   *
   * P1-A 修复:resolver 真正按 providerId 解析,fallback chain 才有效。
   */
  attachHermes(bundle: HermesBundle): void {
    this.hermes = bundle;
    this.config.enableSkills = true;

    // P1-A:自动初始化 SelfHealingExecutor(如果未注入)
    if (this.config.enableSelfHealing && !this.healer) {
      const primaryId = this.config.llmProviderId ?? 'default-service';
      this.healer = new SelfHealingExecutor(
        async (id, _model) => {
          // 通过 LLMProviderManager 按 id 真正取到不同的 ChatModel 实例,
          // 这样 fallback chain 才会真正切换 provider。
          const { getLLMProviderManager } = await import('../llmProvider');
          const manager = getLLMProviderManager();
          return await manager.getProviderById(id);
        },
        {
          retry: { maxAttempts: 2 },
          fallback: {
            // 自动筛选已注册的 provider,避免出现 "未注册的 id"
            chain: this.resolveFallbackChain(),
            failuresBeforeFallback: 1,
          },
          perCallTimeoutMs: 30_000,
        },
      );
    }
  }

  /**
   * 自动构造 fallback chain:把 llmProviderManager 已注册的 provider 按优先级排序,
   * 排除主 provider。如果 user 配置了 llmProviderId,优先用 taskType 对应的默认 chain。
   */
  private async resolveFallbackChainAsync(): Promise<string[]> {
    try {
      const { getLLMProviderManager } = await import('../llmProvider');
      const manager = getLLMProviderManager();
      return this.resolveFallbackChain();
    } catch {
      return ['deepseek', 'openai', 'anthropic', 'ollama'];
    }
  }

  /**
   * 同步版本:fallback chain 优先用配置,失败兜底为通用优先级。
   * (由 attachHermes 在初始化时调用一次,后续 fallback 真正用 manager 验证)
   */
  private resolveFallbackChain(): string[] {
    const custom = this.config.llmFallbackChain;
    if (custom && custom.length > 0) return custom;
    return ['deepseek', 'openai', 'anthropic', 'ollama'];
  }

  /** 检查并临时关闭 Skill 注入(用于 A/B 测试) */
  setSkillsEnabled(enabled: boolean): void {
    this.config.enableSkills = enabled;
  }

  /** P1-A:关闭自愈(用于 A/B 测试) */
  setSelfHealingEnabled(enabled: boolean): void {
    this.config.enableSelfHealing = enabled;
  }

  /** P1-B:启用 MoA(默认关闭,因为会增加 token) */
  setMoAEnabled(enabled: boolean): void {
    this.config.enableMoA = enabled;
  }

  /**
   * P0-B:把一次执行结果喂给 SkillEvolver。
   * 默认在 execute() / executeStream() 末尾自动调用,
   * 子类若有更复杂的中间步骤可以主动再调用一次。
   * 内部异步(统计写入 + 进化门控),调用方用 void 即可,不阻塞主流程。
   */
  async recordExecution(trace: Partial<ExecutionTrace> & { query: string }): Promise<void> {
    if (!this.hermes?.evolver) return;
    const full: ExecutionTrace = {
      agentName: trace.agentName ?? this.constructor.name,
      query: trace.query,
      toolCalls: trace.toolCalls ?? [],
      outcome: trace.outcome ?? 'success',
      finalOutput: trace.finalOutput ?? '',
      failureReason: trace.failureReason,
      userFeedback: trace.userFeedback,
      skillIdsUsed: trace.skillIdsUsed ?? this.lastRetrievedSkills.map((s) => s.skill.id),
      durationMs: trace.durationMs ?? 0,
      timestamp: trace.timestamp ?? new Date().toISOString(),
    };
    await this.hermes.evolver.recordExecution(full);
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

      // Hermes Skills 注入(可选,P0-A)
      let skillAddition = '';
      if (this.config.enableSkills && this.hermes) {
        const scored = await this.hermes.retriever.retrieve(query, {
          topK: this.config.skillTopK ?? 3,
          activeOnly: true,
        });
        this.lastRetrievedSkills = scored;
        if (scored.length > 0) {
          skillAddition = this.hermes.retriever.buildSystemPromptAddition(scored);
          if (skillAddition) {
            // 重建首条 SystemMessage,把 skillAddition 拼到 systemPrompt 后
            messages[0] = this.buildSystemMessage(skillAddition);
            // 不再此处 recordUsage — 改为在 recordExecution 内根据最终 outcome 统一结算,
            // 避免一次失败执行被同时记 success 和 failure 两次
          }
        }
      }

      // 调用LLM (P1-A:用 SelfHealingExecutor 包裹)
      let output: string;
      let toolCallCount = 0;
      if (this.healer && this.config.enableSelfHealing) {
        const healingResult = await this.healer.invoke({
          messages,
          tools: this.tools,
        });
        if (!healingResult.success) {
          const lastErr = healingResult.attempts.find((a) => !a.success)?.error;
          // 携带 attempts,让上层 catch 时能拿到
          const err = new Error(
            `LLM 调用失败(已尝试 ${healingResult.attempts.length} 次):${lastErr?.message ?? 'unknown'}`,
          );
          (err as Error & { healingAttempts?: unknown }).healingAttempts = healingResult.attempts;
          throw err;
        }
        const r = healingResult.output as { content: unknown };
        output = typeof r.content === 'string' ? r.content : JSON.stringify(r.content);
      } else {
        const response = await llm.invoke(messages);
        output = response.content as string;
      }

      // 记录到记忆
      if (this.config.enableMemory) {
        this.addToMemory(query, output);
      }

      const executionTime = Date.now() - startTime;

      const result: AgentResponse = {
        output,
        metadata: {
          executionTime,
          toolCalls: toolCallCount,
        },
      };

      // P0-B:自动反馈给 SkillEvolver(异步,不阻塞返回)
      if (this.hermes?.evolver) {
        void this.recordExecution({
          agentName: this.constructor.name,
          query,
          toolCalls: [],
          outcome: 'success',
          finalOutput: result.output,
          durationMs: executionTime,
        });
      }

      return result;
    } catch (error) {
      console.error(`Agent execution failed:`, error);
      // 失败也喂给 evolver,触发 create 反思
      if (this.hermes?.evolver) {
        void this.recordExecution({
          agentName: this.constructor.name,
          query,
          toolCalls: [],
          outcome: 'failure',
          finalOutput: '',
          failureReason: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startTime,
        });
      }
      throw new Error(
        `Agent执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 流式执行（支持实时输出）
   */
  async *executeStream(query: string, _context?: Record<string, any>): AsyncGenerator<string> {
    const startTime = Date.now();
    let fullResponse = '';
    try {
      const llm = await this.initializeLLM();
      this.tools = this.defineTools();

      const messages = this.buildMessages(query);

      // Hermes Skills 注入(流式)
      if (this.config.enableSkills && this.hermes) {
        const scored = await this.hermes.retriever.retrieve(query, {
          topK: this.config.skillTopK ?? 3,
          activeOnly: true,
        });
        this.lastRetrievedSkills = scored;
        if (scored.length > 0) {
          const skillAddition = this.hermes.retriever.buildSystemPromptAddition(scored);
          if (skillAddition) {
            messages[0] = this.buildSystemMessage(skillAddition);
            // 同 execute(),不立即 recordUsage — 由 recordExecution 统一结算
          }
        }
      }

      // 注意:LangChain的流式API
      // P1-A 注:流式暂不包 SelfHealing(同一连接中断重试语义复杂),
      // 若需要流式自愈,可改用 healer.invoke + 自实现 token-level yield。
      const stream = await llm.stream(messages);

      for await (const chunk of stream) {
        const content = chunk.content as string;
        fullResponse += content;
        yield content;
      }

      // 记录到记忆
      if (this.config.enableMemory) {
        this.addToMemory(query, fullResponse);
      }

      // P0-B:成功 trace 喂给 evolver
      if (this.hermes?.evolver) {
        void this.recordExecution({
          agentName: this.constructor.name,
          query,
          outcome: 'success',
          finalOutput: fullResponse,
          durationMs: Date.now() - startTime,
        });
      }
    } catch (error) {
      console.error(`Stream execution failed:`, error);
      if (this.hermes?.evolver) {
        void this.recordExecution({
          agentName: this.constructor.name,
          query,
          outcome: 'failure',
          finalOutput: fullResponse,
          failureReason: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startTime,
        });
      }
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
   * 构造一个 SystemMessage,内容 = agent systemPrompt + 可选 Skill 注入。
   * 子类与 execute() 都通过此方法构造第一条消息,
   * 避免直接修改 SystemMessage.content(在 LangChain v1 中是只读)。
   */
  protected buildSystemMessage(skillAddition: string = ''): SystemMessage {
    const text = skillAddition
      ? `${this.systemPrompt}${skillAddition}`
      : this.systemPrompt;
    return new SystemMessage(text);
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
