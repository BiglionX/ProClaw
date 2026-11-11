import {
  SmartToy as BotIcon,
  ExpandLess as CollapseIcon,
  Minimize as MinimizeIcon,
  OpenInFull as MaximizeIcon,
  CloseFullscreen as RestoreIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Image as ImageIcon,
  Edit as EditIcon,
  Tune as TuneIcon,
  Mic as MicIcon,
  Info as InfoIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Slide,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { executeCommand, parseCommand } from '../../lib/commandParser';
import { checkLLMConnectionStatus, getConnectionGuideMessage, getPersonalizedRecommendations, recordUserBehavior } from '../../lib/aiGuide';
import { routeAssistantTurn } from '../../lib/assistantRouter';
import { useAppModeStore } from '../../config/appMode';
import { getLightInitialMessage, getLightQuickCommands, queryLightAI } from '../../lib/lightAIAssistant';
import { DEFAULT_SECRETARY_NAME, DEFAULT_AVATAR_KEY, SECRETARY_STORAGE_KEYS, AVATAR_PRESETS } from '../../types/secretary';
import { getBapSummary } from '../../lib/secretaryBap';
import { startBriefingScheduler } from '../../lib/secretaryBriefing';
import {
  ASSISTANT_QUICK_COMMANDS,
  getAssistantSystemPrompt,
  getBossProfile,
  submitDecisionProposal,
  resolveDecision,
  type DecisionProposal,
  type BossProfile,
} from '../../lib/assistantAgent';
import { getLLMForTask } from '../../lib/llmProvider';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { isDemoAccount, getTokenBalance, deductTokens } from '../../lib/aiTeamTokenService';
import { estimateTokens } from '../../lib/aiTools';
import { DEFAULT_OUTBOUND_TIMEOUT_MS, OUTBOUND_ERROR_MESSAGE, isAbortError, isNetworkError, withTimeout } from '../../lib/fetchWithTimeout';
import SecretaryAvatarSelector from './SecretaryAvatarSelector';
import SecretaryNameDialog from './SecretaryNameDialog';
import BapSettingsPanel from './BapSettingsPanel';
// 补全 3：集成语音通话面板（任务 #3）
import VoiceCallPanel from './VoiceCallPanel';
import { isSpeechRecognitionSupported } from '../../lib/speechService';

// ===== 团队上下文类型 =====
export interface TeamChatContext {
  teamId: string;
  teamName: string;
  memberRole?: string;
}

// ===== 组件 Props =====
export interface FloatingAgentChatProps {
  teamContext?: TeamChatContext;
  onClose?: () => void;
}

/**
 * 根据团队上下文获取快捷指令
 */
export function getTeamQuickCommands(teamContext?: TeamChatContext, isLight?: boolean): Array<{ label: string; command: string }> {
  if (!teamContext) {
    return isLight ? getLightQuickCommands() : ASSISTANT_QUICK_COMMANDS;
  }

  // 根据团队名称特征返回不同的快捷指令
  const name = teamContext.teamName || '';
  if (name.includes('新媒体') || name.includes('运营')) {
    return [
      { label: '生成文案', command: '帮我写一篇小红书种草文案' },
      { label: '生图', command: '帮我生成一张商品海报图' },
      { label: '数据分析', command: '分析最近一周的运营数据' },
      { label: '发布日程', command: '查看本周发布计划' },
    ];
  }
  if (name.includes('团购') || name.includes('本地')) {
    return [
      { label: '订单查询', command: '查询今日团购订单' },
      { label: '活动管理', command: '查看当前团购活动' },
      { label: '数据统计', command: '团购数据统计' },
      { label: '打印订单', command: '打印团购订单' },
    ];
  }
  if (name.includes('商城') || name.includes('电商')) {
    return [
      { label: '商品同步', command: '同步商品到商城' },
      { label: '订单处理', command: '查看待处理订单' },
      { label: '客服消息', command: '查看未回复消息' },
      { label: '数据看板', command: '商城经营数据' },
    ];
  }
  // 通用团队指令
  return [
    { label: '任务分派', command: '给团队分派新任务' },
    { label: '工作进度', command: '查看团队工作进度' },
    { label: '生成报告', command: '生成工作报告' },
    { label: '成员管理', command: '查看团队成员信息' },
  ];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ============================================================
// 打字机效果组件
// ============================================================
function TypewriterText({ text, speed = 35, onComplete }: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');

    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setDisplayed(text);
        onComplete?.();
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]);

  return <>{displayed}</>;
}

export default function FloatingAgentChat({ teamContext, onClose }: FloatingAgentChatProps = {}) {
  const mode = useAppModeStore(state => state.mode);
  // v1.0.0+tray+db+contacts+msgs+safety+view+demo:
  //   新用户首次启动时自动展开窗口，避免隐藏后用户找不到入口
  //   （老用户已手动关闭过，保留关闭状态）
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return localStorage.getItem('proclaw:chat-guide-shown') !== 'true';
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // ===== 秘书身份状态 =====
  const [secretaryName, setSecretaryName] = useState<string>(DEFAULT_SECRETARY_NAME);
  const [secretaryAvatar, setSecretaryAvatar] = useState<string>(DEFAULT_AVATAR_KEY);
  const [bapTopKpis, setBapTopKpis] = useState<string[]>([]);
  
  // ===== 统一助理：老板画像 + 决策确认状态 =====
  const [bossProfile, setBossProfile] = useState<BossProfile | null>(null);
  const [pendingProposal, setPendingProposal] = useState<DecisionProposal | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState('');
  
  // ===== 右键菜单状态 =====
  const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
  
  // ===== 对话框状态 =====
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [bapSettingsOpen, setBapSettingsOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  // 补全 3：语音通话面板状态
  const [voiceCallOpen, setVoiceCallOpen] = useState(false);
  const [sttSupported] = useState(isSpeechRecognitionSupported());
  
  // 从 localStorage 加载名称和头像
  useEffect(() => {
    const savedName = localStorage.getItem(SECRETARY_STORAGE_KEYS.NAME);
    const savedAvatar = localStorage.getItem(SECRETARY_STORAGE_KEYS.AVATAR);
    if (savedName) setSecretaryName(savedName);
    if (savedAvatar) setSecretaryAvatar(savedAvatar);
  }, []);
  
  // 加载 BAP 数据
  useEffect(() => {
    getBapSummary().then(summary => {
      if (summary.topKpis.length > 0) {
        setBapTopKpis(summary.topKpis);
      }
    }).catch(() => {});
  }, []);

  // 加载老板画像（统一记忆层：BAP + CEO 偏好 + PCP 目标）
  useEffect(() => {
    if (teamContext || mode === 'light') return;
    getBossProfile().then(profile => {
      setBossProfile(profile);
    }).catch(() => {});
  }, [teamContext, mode]);

  // 启动简报调度器
  useEffect(() => {
    if (!teamContext && mode !== 'light') {
      const cleanup = startBriefingScheduler(secretaryName, (briefingContent) => {
        const briefingMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: briefingContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, briefingMsg]);
      });
      return cleanup;
    }
  }, [teamContext, mode, secretaryName]);
  
  // 初始化消息 - 根据团队上下文动态生成
  const getInitialMessages = useCallback((): Message[] => {
    let content: string;
    if (teamContext) {
      content = `你好！我是 **${teamContext.teamName}** 的 AI 助手，可以帮你管理团队任务、查看工作进度、分派工作。有什么可以帮你的吗？`;
    } else if (mode === 'light') {
      content = getLightInitialMessage();
    } else {
      let welcomeContent = `老板好！我是您的商务秘书，可以叫我「${secretaryName}」。`;
      if (bapTopKpis.length > 0) {
        welcomeContent += `\n\n📊 我注意到您常关注：${bapTopKpis.join('、')}。我会优先为您呈报这些数据。`;
      }
      welcomeContent += `\n\n可以帮您查看经营数据、做统计分析、监控异常。有什么想了解的随时问我～`;
      content = welcomeContent;
    }
    return [{ id: '1', role: 'assistant' as const, content, timestamp: new Date() }];
  }, [teamContext, mode, secretaryName, bapTopKpis]);

  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 窗口尺寸状态
  const [windowHeight, setWindowHeight] = useState(600);
  const [windowWidth, setWindowWidth] = useState(420);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 从 localStorage 加载窗口尺寸偏好
  useEffect(() => {
    const savedHeight = localStorage.getItem('agent-chat-height');
    const savedWidth = localStorage.getItem('agent-chat-width');
    if (savedHeight) setWindowHeight(parseInt(savedHeight));
    if (savedWidth) setWindowWidth(parseInt(savedWidth));
  }, []);

  // 保存窗口尺寸到 localStorage
  useEffect(() => {
    if (!isMaximized && !isMinimized) {
      localStorage.setItem('agent-chat-height', windowHeight.toString());
      localStorage.setItem('agent-chat-width', windowWidth.toString());
    }
  }, [windowHeight, windowWidth, isMaximized, isMinimized]);

  // 处理窗口拖拽调整大小
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const newHeight = window.innerHeight - e.clientY - 24;
      const newWidth = window.innerWidth - e.clientX - 24;
      
      // 限制最小和最大尺寸
      if (newHeight >= 300 && newHeight <= window.innerHeight - 150) {
        setWindowHeight(newHeight);
      }
      if (newWidth >= 350 && newWidth <= window.innerWidth - 100) {
        setWindowWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'nw-resize';
    document.body.style.userSelect = 'none';
  };

  // 检查LLM连接状态
  // v1.0.0+tray+db+contacts+msgs+safety+view+demo:
  //   触发条件改为基于 localStorage 标志，不再依赖 messages.length
  //   原条件 messages.length === 1 在用户发送过消息后失效，导致
  //   重启应用或重新打开窗口时不再显示引导
  //   现在只在首次打开时显示一次（PROCLAW_CHAT_GUIDE_SHOWN_KEY）
  useEffect(() => {
    if (isOpen) {
      const hasShown = localStorage.getItem('proclaw:chat-guide-shown') === 'true';
      if (!hasShown) {
        checkLLMAndGuide();
        localStorage.setItem('proclaw:chat-guide-shown', 'true');
      }
    }
  }, [isOpen]);

  // ===== 右键菜单处理 =====
  const handleContextMenuClose = useCallback(() => {
    setContextMenuAnchor(null);
  }, []);

  const handleMenuChangeAvatar = useCallback(() => {
    handleContextMenuClose();
    setAvatarSelectorOpen(true);
  }, [handleContextMenuClose]);

  const handleMenuChangeName = useCallback(() => {
    handleContextMenuClose();
    setNameDialogOpen(true);
  }, [handleContextMenuClose]);

  const handleMenuOpenSettings = useCallback(() => {
    handleContextMenuClose();
    setBapSettingsOpen(true);
  }, [handleContextMenuClose]);

  const handleMenuAbout = useCallback(() => {
    handleContextMenuClose();
    setAboutDialogOpen(true);
  }, [handleContextMenuClose]);

  // 补全 3：启用语音通话
  const handleMenuVoiceCall = useCallback(() => {
    handleContextMenuClose();
    if (!sttSupported) {
      // 不支持时显示提示（可通过 setMessage 等）
      const tipMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '抱歉，当前浏览器不支持语音输入。请使用 Chrome 或 Edge 浏览器以体验完整功能。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, tipMsg]);
      return;
    }
    setVoiceCallOpen(true);
  }, [handleContextMenuClose, sttSupported]);

  const handleAvatarSelect = useCallback((key: string) => {
    setSecretaryAvatar(key);
    localStorage.setItem(SECRETARY_STORAGE_KEYS.AVATAR, key);
  }, []);

  const handleNameConfirm = useCallback((name: string) => {
    setSecretaryName(name);
    localStorage.setItem(SECRETARY_STORAGE_KEYS.NAME, name);
    // 添加秘书确认改名消息
    const confirmMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `好的老板，以后就叫我「${name}」吧！有什么吩咐？`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMsg]);
  }, []);

  const handleBapSettingsChanged = useCallback(() => {
    // 重新加载 BAP 摘要
    getBapSummary().then(summary => {
      if (summary.topKpis.length > 0) {
        setBapTopKpis(summary.topKpis);
      }
    }).catch(() => {});
  }, []);

  const checkLLMAndGuide = async () => {
    try {
      const status = await checkLLMConnectionStatus();
      if (!status.isConnected) {
        const guideMessage = await getConnectionGuideMessage();
        const guideMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: guideMessage,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, guideMsg]);
      } else {
        // 如果已连接，显示个性化推荐
        const recommendations = getPersonalizedRecommendations();
        if (recommendations) {
          const recMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: recommendations,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, recMsg]);
        }
      }
    } catch (error) {
      console.error('Failed to check LLM connection:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    // 记录用户查询行为
    recordUserBehavior('query');

    try {
      const pushAssistant = (content: string) => {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
        }
      };

      const routed = await routeAssistantTurn(userInput, { secretaryName });
      if (routed?.kind === 'decision') {
        const proposal = await submitDecisionProposal(routed.proposal);
        setPendingProposal(proposal);
        pushAssistant(`📋 检测到「${proposal.intentSummary}」属于经营决策请求。作为您的全能助理，我已生成决策建议并记录，请在弹窗中确认或拒绝。`);
        setDecisionOpen(true);
        return;
      }
      if (routed?.kind === 'message') {
        pushAssistant(routed.content);
        return;
      }

      if (mode === 'light') {
        const result = await queryLightAI(userInput);
        let responseText = result.text;
        if (result.sources.length > 0) {
          responseText += '\n\n---\n📎 参考来源：\n' + result.sources.map(s =>
            `- [${s.type}] ${s.title}`
          ).join('\n');
        }
        pushAssistant(responseText);
        return;
      }

      if (isDemoAccount()) {
        const balance = getTokenBalance();
        if (balance <= 0) {
          pushAssistant('⚠️ 您的演示 Token 余额已用完（10,000 PT）。如需继续测试，请联系我们获取更多 Token。');
          return;
        }
      }

      try {
        abortControllerRef.current = new AbortController();
        const userSignal = abortControllerRef.current.signal;
        const { signal: timedSignal, dispose } = withTimeout(userSignal, DEFAULT_OUTBOUND_TIMEOUT_MS);
        try {
          const llm = await getLLMForTask('business_insight');
          const systemPrompt = getAssistantSystemPrompt(secretaryName, bossProfile ?? undefined);
          const systemMsg = new SystemMessage({ content: systemPrompt });
          const userMsg = new HumanMessage({ content: userInput });
          const llmResponse = await llm.invoke([systemMsg, userMsg], { signal: timedSignal });
          const replyContent = typeof llmResponse.content === 'string'
            ? llmResponse.content
            : JSON.stringify(llmResponse.content);

          let finalContent = replyContent;
          if (isDemoAccount()) {
            const outputTokens = (llmResponse.response_metadata as any)?.tokenUsage?.completionTokens
              ?? estimateTokens(replyContent);
            const totalUsed = estimateTokens(userInput + systemPrompt) + outputTokens;
            try {
              const remaining = deductTokens(totalUsed);
              finalContent += `\n\n---\n💳 本次消耗 ${totalUsed} PT，剩余 ${remaining} PT`;
            } catch {
              finalContent += `\n\n---\n⚠️ Token 余额不足（剩余 ${getTokenBalance()} PT），部分额度可能超支。`;
            }
          }

          pushAssistant(finalContent);
        } finally {
          dispose();
        }
      } catch (_llmErr) {
        const userAborted = abortControllerRef.current?.signal.aborted;
        if (isAbortError(_llmErr) && userAborted) {
          abortControllerRef.current = null;
          pushAssistant('⏹️ 已停止响应。');
        } else if (isNetworkError(_llmErr)) {
          pushAssistant(`⚠️ ${OUTBOUND_ERROR_MESSAGE}\n\n请前往 **设置 → AI 设置** 配置大模型（如 DeepSeek API），配置后秘书即可使用智能对话。`);
        } else if (isAbortError(_llmErr)) {
          pushAssistant(`⏱️ ${OUTBOUND_ERROR_MESSAGE}\n\n可能是网络抖动或 AI 服务暂时不可达，请稍后重试。`);
        } else {
          const fallback = parseCommand(userInput, { recordUnknown: false });
          pushAssistant(await executeCommand(fallback));
        }
      }
    } catch (error) {
      console.error('[AgentChat] 处理指令失败:', error);
      const errorDetail = error instanceof Error ? error.message : String(error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `抱歉,处理您的指令时出现了错误。\n\n错误详情：${errorDetail}\n\n请稍后重试，或联系技术支持。`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // ===== 统一助理：决策确认流程 =====
  const handleDecisionConfirm = useCallback(async () => {
    if (!pendingProposal || decisionLoading) return;
    setDecisionLoading(true);
    try {
      await resolveDecision(pendingProposal, true);
      const confirmMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ 决策已确认：${pendingProposal.actionDescription}\n\n已记入决策日志，我会持续跟进执行情况。`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMsg]);
      setDecisionOpen(false);
      setPendingProposal(null);
    } finally {
      setDecisionLoading(false);
    }
  }, [pendingProposal, decisionLoading]);

  const handleDecisionReject = useCallback(async () => {
    if (!pendingProposal || decisionLoading) return;
    setDecisionLoading(true);
    try {
      await resolveDecision(pendingProposal, false, decisionFeedback.trim() || '未说明原因');
      const rejectMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `已收到，该决策已取消${decisionFeedback.trim() ? `（原因：${decisionFeedback.trim()}）` : ''}。如需调整方案，随时告诉我。`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, rejectMsg]);
      setDecisionOpen(false);
      setPendingProposal(null);
      setDecisionFeedback('');
    } finally {
      setDecisionLoading(false);
    }
  }, [pendingProposal, decisionLoading, decisionFeedback]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => {
      const next = !prev;
      // v1.0.0+tray+db+contacts+msgs+safety+view+demo:
      //   用户主动关闭聊天后，标记引导已完成，下次启动不再自动弹出
      if (!next) {
        localStorage.setItem('proclaw:chat-guide-shown', 'true');
      }
      return next;
    });
    setUnreadCount(0); // 打开时清除未读计数
  };

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
    if (isMaximized) setIsMaximized(false);
  };

  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
  };

  return (
    <>
      {/* 右键上下文菜单 */}
      <Menu
        anchorEl={contextMenuAnchor}
        open={!!contextMenuAnchor}
        onClose={handleContextMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleMenuChangeAvatar}>
          <ListItemIcon><ImageIcon fontSize="small" /></ListItemIcon>
          <ListItemText>更换头像</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuChangeName}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>修改名称</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuOpenSettings}>
          <ListItemIcon><TuneIcon fontSize="small" /></ListItemIcon>
          <ListItemText>关注设置</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuVoiceCall} disabled={!sttSupported}>
          <ListItemIcon>
            <MicIcon fontSize="small" sx={{ color: sttSupported ? 'primary.main' : 'text.disabled' }} />
          </ListItemIcon>
          <ListItemText
            primary="语音通话"
            secondary={sttSupported ? '使用麦克风与小 Pro 对话' : '当前浏览器不支持'}
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuAbout}>
          <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
          <ListItemText>关于秘书</ListItemText>
        </MenuItem>
      </Menu>
      {/* 浮动按钮 - 始终显示 */}
      <Slide
        direction="up"
        in={!isOpen || isMinimized}
        mountOnEnter
        unmountOnExit
      >
        <Tooltip
          title={
            isOpen
              ? `收起 ${secretaryName}`
              : `${secretaryName} ${unreadCount > 0 ? `(${unreadCount})` : ''}`
          }
        >
          <Fab
            color="default"
            onClick={toggleChat}
            data-testid="Fab"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1351,
              width: 56,
              height: 56,
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'visible',
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
          >
            <Box sx={{ position: 'relative', cursor: 'context-menu' }} onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuAnchor(e.currentTarget.parentElement || e.currentTarget);
            }}>
              <Avatar
                src={AVATAR_PRESETS.find(p => p.key === secretaryAvatar)?.src}
                sx={{
                  width: 56,
                  height: 56,
                  boxShadow: '0 0 0 2px rgba(255,59,48,0.35), 0 4px 16px rgba(255,59,48,0.25)',
                }}
              >
                <BotIcon sx={{ fontSize: 28 }} />
              </Avatar>
              {unreadCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    bgcolor: '#999',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Box>
              )}
            </Box>
          </Fab>
        </Tooltip>
      </Slide>

      {/* 聊天面板 */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: isMinimized ? 64 : isMaximized ? 'calc(100vw - 192px - 48px)' : windowWidth,
            height: isMinimized ? 64 : isMaximized ? 'calc(100vh - 48px)' : windowHeight,
            maxHeight: isMaximized ? 'calc(100vh - 48px)' : 'calc(100vh - 100px)',
            maxWidth: isMaximized ? 'calc(100vw - 192px - 48px)' : '100vw',
            left: isMaximized ? 192 : 'auto',
            zIndex: 1350,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: isMinimized ? '50%' : 3,
            overflow: 'hidden',
            transition: isResizing.current ? 'none' : 'all 0.3s ease',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {/* 标题栏 */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#1a1a1a',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              borderBottom: '1px solid #333',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box onContextMenu={(e) => {
                if (!teamContext) {
                  e.preventDefault();
                  setContextMenuAnchor(e.currentTarget);
                }
              }} sx={{
                cursor: teamContext ? 'default' : 'context-menu',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
                ...(!!contextMenuAnchor && {
                  outline: '2px solid rgba(25, 118, 210, 0.3)',
                  outlineOffset: 2,
                  borderRadius: '50%',
                }),
              }}>
                <Avatar
                  src={AVATAR_PRESETS.find(p => p.key === secretaryAvatar)?.src}
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.9rem',
                  }}
                >
                  <BotIcon sx={{ fontSize: 18 }} />
                </Avatar>
              </Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {teamContext ? (
                  teamContext.teamName
                ) : (
                  secretaryName
                )}
              </Typography>
              {teamContext?.memberRole && (
                <Chip
                  label={teamContext.memberRole}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(255,59,48,0.2)', color: '#ff3b30' }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {!isMinimized && (
                <>
                  <IconButton
                    size="small"
                    onClick={toggleMaximize}
                    title={isMaximized ? '恢复窗口' : '最大化'}
                    sx={{
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {isMaximized ? (
                      <RestoreIcon fontSize="small" />
                    ) : (
                      <MaximizeIcon fontSize="small" />
                    )}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={toggleMinimize}
                    title="最小化"
                    sx={{
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <MinimizeIcon fontSize="small" />
                  </IconButton>
                </>
              )}
              <IconButton
                size="small"
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    toggleChat();
                  }
                }}
                title="关闭"
                sx={{
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <CollapseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* 最小化状态 - 只显示图标 */}
          {isMinimized ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                bgcolor: '#f5f5f5',
              }}
              onClick={toggleMinimize}
            >
              <Avatar
                src={AVATAR_PRESETS.find(p => p.key === secretaryAvatar)?.src}
                sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
              >
                <BotIcon sx={{ fontSize: 14, color: '#666' }} />
              </Avatar>
            </Box>
          ) : (
            <>
              {/* 消息列表 */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  p: 2,
                  backgroundColor: '#fafafa',
                }}
              >
                {(() => {
                  const lastAssistantIdx = (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].role === 'assistant') return i;
                    }
                    return -1;
                  })();
                  return messages.map((message, msgIdx) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        mb: 2,
                        flexDirection:
                          message.role === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <Avatar
                        src={message.role === 'assistant' ? AVATAR_PRESETS.find(p => p.key === secretaryAvatar)?.src : undefined}
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            message.role === 'user' ? '#666' : '#888',
                          flexShrink: 0,
                          fontSize: '0.9rem',
                        }}
                      >
                        {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                      </Avatar>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          backgroundColor:
                            message.role === 'user' ? '#f0f0f0' : '#ffffff',
                          border: '1px solid',
                          borderColor:
                            message.role === 'user' ? '#ddd' : '#e0e0e0',
                          borderRadius: 2,
                          maxWidth: '80%',
                          position: 'relative',
                        }}
                      >
                        {/* AI 身份标识红点 */}
                        {message.role === 'assistant' && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -3,
                              left: -3,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#FF3B30',
                              border: '2px solid #fff',
                              boxShadow: '0 1px 2px rgba(255,59,48,0.3)',
                              zIndex: 1,
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            '& strong': {
                              fontWeight: 600,
                              color: 'text.primary',
                            },
                          }}
                        >
                          {message.role === 'assistant' && msgIdx === lastAssistantIdx && !isLoading ? (
                            <TypewriterText text={message.content} />
                          ) : (
                            message.content
                          )}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            color: 'text.secondary',
                            fontSize: '0.65rem',
                            textAlign: message.role === 'user' ? 'right' : 'left',
                          }}
                        >
                          {message.timestamp.toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Paper>
                    </Box>
                  ));
                })()}

                {isLoading && (
                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Avatar
                      src={AVATAR_PRESETS.find(p => p.key === secretaryAvatar)?.src}
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: '0.9rem',
                      }}
                    >
                      <BotIcon />
                    </Avatar>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        backgroundColor: '#ffffff',
                        border: '1px solid',
                        borderColor: '#e0e0e0',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="text.secondary">
                        思考中...
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleStop}
                        sx={{
                          minWidth: 'auto',
                          px: 1,
                          py: 0.1,
                          fontSize: '0.7rem',
                          lineHeight: '22px',
                          ml: 0.5,
                        }}
                      >
                        停止
                      </Button>
                    </Paper>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Box>

              <Divider />

              {/* 快捷指令按钮 */}
              <Box
                sx={{
                  p: 1.5,
                  backgroundColor: '#f9f9f9',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
                >
                  💡 快捷指令：
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {getTeamQuickCommands(teamContext, mode === 'light').map(item => (
                    <Chip
                      key={item.command}
                      label={item.label}
                      size="small"
                      onClick={() => {
                        setInput(item.command);
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Divider />

              {/* 输入区域 */}
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'background.paper',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入指令..."
                    disabled={isLoading}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '0.85rem',
                      },
                    }}
                  />
                  <IconButton
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    sx={{
                      bgcolor: '#666',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#777',
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'action.disabledBackground',
                        color: 'action.disabled',
                      },
                      width: 40,
                      height: 40,
                      alignSelf: 'flex-end',
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
          
          {/* 拖拽调整大小的手柄 */}
          {!isMinimized && !isMaximized && (
            <Box
              ref={resizeRef}
              onMouseDown={handleResizeStart}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 8,
                cursor: 'ns-resize',
                zIndex: 10,
                '&:hover': {
                  bgcolor: 'rgba(255,59,48,0.1)',
                },
              }}
            />
          )}
        </Paper>
      </Slide>

      {/* 对话框 */}
      <SecretaryAvatarSelector
        open={avatarSelectorOpen}
        currentKey={secretaryAvatar}
        onSelect={handleAvatarSelect}
        onClose={() => setAvatarSelectorOpen(false)}
      />
      {/* 补全 3：语音通话面板（任务 #3） */}
      <VoiceCallPanel
        open={voiceCallOpen}
        onClose={() => setVoiceCallOpen(false)}
        initialMessage={
          teamContext
            ? `你好！我是 **${teamContext.teamName}** 的 AI 助手，可以使用语音跟我对话。`
            : `老板好！我是您的商务秘书「${secretaryName}」，可以叫我小 Pro。使用语音跟我对话吧～`
        }
      />
      <SecretaryNameDialog
        open={nameDialogOpen}
        currentName={secretaryName}
        onConfirm={handleNameConfirm}
        onClose={() => setNameDialogOpen(false)}
      />
      <BapSettingsPanel
        open={bapSettingsOpen}
        onClose={() => setBapSettingsOpen(false)}
        onSettingsChanged={handleBapSettingsChanged}
      />
      
      {/* 决策确认对话框（统一助理：合并 CEO 决策确认能力） */}
      <Dialog
        open={decisionOpen}
        onClose={() => { if (!decisionLoading) { setDecisionOpen(false); setPendingProposal(null); } }}
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon sx={{ color: '#7c4dff' }} />
          <Typography variant="h6" fontWeight={600}>决策确认</Typography>
        </DialogTitle>
        <DialogContent>
          {pendingProposal && (
            <>
              <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {`检测到一项经营决策请求，请您确认：\n\n**${pendingProposal.intentSummary}**\n\n`}
                {`建议动作：${pendingProposal.actionDescription}\n`}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`风险：${pendingProposal.estimatedImpact.riskLevel === 'high' ? '🔴 高' : pendingProposal.estimatedImpact.riskLevel === 'medium' ? '🟡 中' : '🟢 低'}`}
                  sx={{ bgcolor: '#f5f0ff', color: '#7c4dff' }}
                />
                <Chip
                  size="small"
                  label={`资金影响：${pendingProposal.estimatedImpact.budget === 'high' ? '较大' : pendingProposal.estimatedImpact.budget === 'medium' ? '中等' : '较小'}`}
                  sx={{ bgcolor: '#f5f0ff', color: '#7c4dff' }}
                />
                {pendingProposal.decisionId && (
                  <Chip size="small" label={`决策日志已记录`} sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }} />
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                size="small"
                margin="dense"
                sx={{ mt: 2 }}
                placeholder="拒绝时填写原因（选填）"
                value={decisionFeedback}
                onChange={(e) => setDecisionFeedback(e.target.value)}
                disabled={decisionLoading}
              />
              <Box sx={{ mt: 1 }}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  确认后将记入决策日志；实际业务操作仍需您到对应模块执行。
                </Alert>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={handleDecisionReject}
            disabled={decisionLoading}
            variant="outlined"
            color="error"
            size="small"
          >
            拒绝
          </Button>
          <Button
            onClick={handleDecisionConfirm}
            disabled={decisionLoading}
            variant="contained"
            size="small"
            sx={{ bgcolor: '#7c4dff', '&:hover': { bgcolor: '#6a3ee0' } }}
          >
            {decisionLoading ? <CircularProgress size={16} color="inherit" /> : '确认执行'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 关于秘书对话框 */}
      <Dialog open={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>关于秘书</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {`我是「${secretaryName}」，您的全能助理，融合了商务秘书与 CEO 主控官能力。\n\n`}
            {`我能帮您：\n`}
            {`· 查询经营数据、统计分析、监控异常\n`}
            {`· 提出采购/定价/人事/营销等决策建议（经您确认后执行）\n`}
            {`· 记录公司目标、分派任务、生成经营报告\n\n`}
            {`右键我的头像可以换头像、改名字、设置关注数据。`}
          </Typography>
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {`当前名称: ${secretaryName}`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Agent ID: builtin:secretary
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              版本: v1.1 (全能助理，合并秘书 + CEO 能力)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAboutDialogOpen(false)} variant="contained" size="small">知道了</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
