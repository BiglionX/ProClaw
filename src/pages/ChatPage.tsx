import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Image as ImageIcon,
  AttachFile as FileIcon,
  MoreVert as MoreIcon,
  Phone as PhoneIcon,
  Videocam as VideoIcon,
  AutoAwesome as MagicIcon,
  AutoAwesome as AutoAwesomeIcon,
  History as HistoryIcon,
  Groups as GroupIcon,
  Campaign as CampaignIcon,
  Stop as StopIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Contact, Message, getContacts, getMessages, sendMessage, isAITeamGroupId, getAITeamGroupConfig, getAgentGreeting, parseTeamId, type AITeamGroupConfig } from '../lib/contactService';
import { generateGroupChatResponse, type ChatHistoryItem } from '../lib/aiTeamChatService';
import { OUTBOUND_ERROR_MESSAGE } from '../lib/fetchWithTimeout';
import { getTokenBalance, isDemoAccount } from '../lib/aiTeamTokenService';
import { agentRuntime } from '../lib/agentRuntime';
import desktopCallManager from '../services/CallManager';
import {
  getAgentProfileOverride,
  resolveAgentDisplay,
  onProfileChanged,
  type AgentProfileOverride,
} from '../lib/agentProfileService';
import ContextIndicator from '../components/CEO/ContextIndicator';
import TaskCard, { TaskCardData } from '../components/CEO/TaskCard';
import ConfirmationCard, { ConfirmationData } from '../components/CEO/ConfirmationCard';
import DecisionHistoryPanel from '../components/CEO/DecisionHistoryPanel';
import { proclawDecision } from '../lib/ceoController';
import { safeNumber } from '../lib/format';

const CEO_AGENT_ID = 'ceo-agent';

// AI Team 群聊快捷命令
const AI_TEAM_COMMANDS = [
  { label: '/task list', desc: '查看所有任务进度' },
  { label: '/report', desc: '要求 CEO 生成工作报告' },
  { label: '/status', desc: '查看AI Team各成员状态' },
  { label: '@all', desc: '通知所有AI Team成员' },
];

// CEO Agent 快捷命令
const CEO_COMMANDS = [
  { label: '/task list', desc: '查看最近任务' },
  { label: '/context show', desc: '查看项目上下文' },
  { label: '/report daily', desc: '查看日报' },
];

export default function ChatPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiResponding, setAiResponding] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastUserInput, setLastUserInput] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(isDemoAccount() ? getTokenBalance() : -1);
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null);
  const [showDecisionHistory, setShowDecisionHistory] = useState(false);
  const [profileOverride, setProfileOverride] = useState<AgentProfileOverride | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isCEO = contactId === CEO_AGENT_ID;
  const isGroupChat = contactId ? isAITeamGroupId(contactId) : false;
  const groupConfig: AITeamGroupConfig | undefined = isGroupChat && contactId ? getAITeamGroupConfig(contactId) : undefined;

  // 群聊成员计数
  const groupMemberCount = groupConfig ? Object.keys(groupConfig.members).length + 1 : 1; // +1 for Boss
  const groupMembers = groupConfig?.members || {};

  // 获取所有聊天上下文的快捷操作
  const quickActions = agentRuntime.getAllQuickActions('chat');

  useEffect(() => {
    loadData();
  }, [contactId]);

  // 加载 Agent 个性化 override（仅对 team 类型联系人有意义）
  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    (async () => {
      try {
        const ovr = await getAgentProfileOverride(contactId);
        if (!cancelled) setProfileOverride(ovr);
      } catch (e) {
        console.warn('[ChatPage] 读取 profile override 失败:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  // 监听 override 变更事件 → 重新读取
  useEffect(() => {
    const unsubscribe = onProfileChanged(async (changedId) => {
      if (!contactId) return;
      if (changedId && changedId !== contactId) return;
      const ovr = await getAgentProfileOverride(contactId);
      setProfileOverride(ovr);
    });
    return () => unsubscribe();
  }, [contactId]);

  const loadData = async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const contacts = await getContacts();
      const found = contacts.find(c => c.id === contactId);
      setContact(found || null);

      const msgs = await getMessages('self', contactId);
      setMessages(msgs);

      // Agent 主动问候：首次进入 Agent/AI Team 群聊且无历史消息时，
      // Agent 会主动发一条消息：“老板，有啥吩咐？”
      if (msgs.length === 0) {
        const greeting = getAgentGreeting(contactId);
        if (greeting) {
          try {
            const greetingMsg = await sendMessage(greeting.fromUser, contactId, greeting.content);
            greetingMsg.from_user_name = greeting.fromUserName;
            setMessages([greetingMsg]);
          } catch (e) {
            console.error('发送 Agent 问候失败:', e);
          }
        }
      }
    } catch (e) {
      console.error('加载对话失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async () => {
    if (!input.trim() || !contactId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setAiError(null);
    try {
      // 群聊模式：from_user_name 显示为 "Boss 👑"
      const fromUser = isGroupChat ? 'self' : 'self';
      const newMsg = await sendMessage(fromUser, contactId, content);
      // 群聊模式下补上发言人名称
      if (isGroupChat) {
        newMsg.from_user_name = 'Boss 👑';
      }
      setMessages(prev => [...prev, newMsg]);
      scrollToBottom();

      // 群聊模式：调用 LLM 让 CEO Agent 自动响应
      if (isGroupChat && groupConfig) {
        setSending(false); // 释放发送按钮
        setAiResponding(true);
        setLastUserInput(content);
        try {
          // 创建 AbortController 以便用户可取消 AI 思考
          const controller = new AbortController();
          abortControllerRef.current = controller;

          // 构建聊天历史
          const history: ChatHistoryItem[] = messages.map(msg => {
            if (msg.from_user === 'self') {
              return { role: 'user' as const, name: 'Boss 👑', content: msg.content };
            }
            if (msg.content_type === 'system_event') {
              return { role: 'system' as const, name: '系统', content: msg.content };
            }
            if (msg.from_user === 'ceo-agent') {
              return { role: 'ceo' as const, name: 'CEO Agent', content: msg.content };
            }
            return { role: 'agent' as const, name: msg.from_user_name || msg.from_user, content: msg.content };
          });
          // 加上当前发送的消息
          history.push({ role: 'user', name: 'Boss 👑', content });

          const aiResponse = await generateGroupChatResponse(content, history, groupConfig, controller.signal);

          // 用户取消：不需要显示任何内容
          if (aiResponse.aborted) return;

          // 检测是否是出站连接失败的回复，如果是则设置 aiError 供顶部红色提示
          const isOutboundFailure =
            aiResponse.replyContent.includes(OUTBOUND_ERROR_MESSAGE) ||
            aiResponse.replyContent.includes('无法连接到 AI 服务') ||
            aiResponse.replyContent.includes('网络异常');
          if (isOutboundFailure) {
            setAiError(aiResponse.replyContent);
          } else {
            setAiError(null);
          }

          // 将 AI 回复作为 ceo-agent 的消息写入
          const aiMsg = await sendMessage('ceo-agent', contactId, aiResponse.replyContent);
          aiMsg.from_user_name = 'CEO Agent';
          aiMsg.content_type = 'text';
          setMessages(prev => [...prev, aiMsg]);

          // 更新 token 余额
          if (isDemoAccount()) {
            setTokenBalance(aiResponse.remainingTokens);
          }
          scrollToBottom();
        } catch (aiErr) {
          console.error('AI 响应失败:', aiErr);
          // 兜底：LLM 本身抛错（被 aiTeamChatService 包装为友好消息）但这里仍有理论上可能的额外错误
          setAiError(OUTBOUND_ERROR_MESSAGE);
        } finally {
          abortControllerRef.current = null;
          setAiResponding(false);
        }
      }
    } catch (e) {
      console.error('发送失败:', e);
    } finally {
      if (!isGroupChat) {
        setSending(false);
      }
    }
  };

  /**
   * 重试上一次 LLM 调用：重新提交 lastUserInput
   */
  const handleRetryAi = () => {
    if (!lastUserInput || sending || aiResponding) return;
    setInput(lastUserInput);
    setAiError(null);
    // 利用 setTimeout 确保 setInput 生效后再发送
    setTimeout(() => handleSend(), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 取消 AI 思考 */
  const handleStopAI = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionAnchor(event.currentTarget);
  };

  const handleActionSelect = async (agentId: string, actionId: string) => {
    setActionAnchor(null);
    const action = agentRuntime.getQuickActions(agentId).find(a => a.id === actionId);
    if (action?.triggerMethod) {
      await agentRuntime.triggerQuickAction(agentId, actionId);
    } else if (action?.triggerMessage) {
      setInput(`/agent ${agentId} ${action.triggerMessage}`);
    }
  };

  /** 尝试解析消息内容为任务卡片数据 */
  const parseTaskCard = (msg: Message): TaskCardData | null => {
    if ((msg.content_type as any) === 'task_card') {
      try {
        return JSON.parse(msg.content) as TaskCardData;
      } catch {
        return null;
      }
    }
    // 尝试验证 JSON 格式的任务卡片
    if (msg.content.startsWith('{') && msg.content.includes('"taskId"')) {
      try {
        return JSON.parse(msg.content) as TaskCardData;
      } catch {
        return null;
      }
    }
    return null;
  };

  /** 尝试解析消息内容为确认卡片数据 */
  const parseConfirmationCard = (msg: Message): ConfirmationData | null => {
    if ((msg.content_type as any) === 'confirmation') {
      try {
        return JSON.parse(msg.content) as ConfirmationData;
      } catch {
        return null;
      }
    }
    return null;
  };

  /** 确认卡片: 确认操作 */
  const handleConfirm = async (data: ConfirmationData) => {
    try {
      // 记录决策日志
      await proclawDecision.addLog({
        decision_type: data.actionType === 'update_pcp' ? 'context_add' :
          data.actionType === 'dispatch_task' ? 'task_dispatch' : 'agent_request',
        proposed_content: JSON.stringify({
          intentSummary: data.intentSummary,
          actionDescription: data.actionDescription,
          details: data.details,
        }),
        boss_decision: 'approved',
        estimated_risk: data.estimatedImpact?.riskLevel,
      });
      console.log('[CEO] Confirmed:', data.actionDescription);
    } catch (e) {
      console.error('Failed to log decision:', e);
    }
  };

  /** 确认卡片: 拒绝操作 */
  const handleReject = async (data: ConfirmationData, reason?: string) => {
    try {
      await proclawDecision.addLog({
        decision_type: data.actionType === 'update_pcp' ? 'context_add' :
          data.actionType === 'dispatch_task' ? 'task_dispatch' : 'agent_request',
        proposed_content: JSON.stringify({
          intentSummary: data.intentSummary,
          actionDescription: data.actionDescription,
          details: data.details,
        }),
        boss_decision: 'rejected',
        boss_feedback: reason,
        estimated_risk: data.estimatedImpact?.riskLevel,
      });
      console.log('[CEO] Rejected:', data.actionDescription, 'Reason:', reason);
    } catch (e) {
      console.error('Failed to log decision:', e);
    }
  };

  /** 确认卡片: 稍后提醒 */
  const handleSnooze = async (data: ConfirmationData, minutes: number) => {
    try {
      await proclawDecision.addLog({
        decision_type: data.actionType === 'update_pcp' ? 'context_add' :
          data.actionType === 'dispatch_task' ? 'task_dispatch' : 'agent_request',
        proposed_content: JSON.stringify({
          intentSummary: data.intentSummary,
          actionDescription: data.actionDescription,
          details: data.details,
        }),
        boss_decision: 'snoozed',
        boss_feedback: `${minutes}分钟后提醒`,
        estimated_risk: data.estimatedImpact?.riskLevel,
      });
      console.log('[CEO] Snoozed:', data.actionDescription, 'for', minutes, 'minutes');
      // 显示提示
      alert(`已设置为 ${minutes} 分钟后提醒`);
    } catch (e) {
      console.error('Failed to log decision:', e);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  // 分组消息（按日期）
  const groupedMessages = messages.reduce<{ date: string; items: Message[] }[]>((acc, msg) => {
    const dateStr = formatDate(msg.created_at);
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.items.push(msg);
    } else {
      acc.push({ date: dateStr, items: [msg] });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!contact) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">联系人不存在</Typography>
        <IconButton onClick={() => navigate('/contacts')} sx={{ mt: 2 }}>
          <BackIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 128px)' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      {/* 聊天头部 */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px 12px 0 0',
          flexShrink: 0,
        }}
      >
        <IconButton onClick={() => navigate('/contacts')} size="small">
          <BackIcon />
        </IconButton>
        {(() => {
          // 解析显示用头像和昵称（override 优先）
          const resolved = !isGroupChat && contact
            ? resolveAgentDisplay(contact.id, contact.name, contact.name.charAt(0), profileOverride)
            : null;
          const avatarSrc = resolved?.isCustomAvatar
            ? profileOverride?.custom_avatar_path
            : resolved?.avatarUrl;
          // 头像点击跳转规则:
          // 1) AI Team 群聊 (isGroupChat) → /team-profile/:teamId (类似 QQ 群资料)
          // 2) CEO Agent → 不响应(老板特殊身份保留)
          // 3) 单 Agent 联系人 (contact_type: team/internal/external) → /agent-profile/:agentId
          // 4) data.联系 human group → 暂不响应(预留)
          const handleHeadAvatarClick = () => {
            if (!contactId) return;
            // AI Team 群聊 → 跳到 AI Team 小组详情页(类似 QQ 群资料)
            if (isGroupChat) {
              const teamId = parseTeamId(contactId);
              navigate(`/team-profile/${teamId}`);
              return;
            }
            // CEO Agent: 不响应
            if (isCEO) return;
            // 传统"群组"联系人: 暂不响应
            if (contact?.contact_type === 'group') return;
            // 单 Agent / 内部 / 外部联系人 → 跳 Agent 资料页
            navigate(`/agent-profile/${contactId}`);
          };
          return (
            <Tooltip
              title={isGroupChat || isCEO ? '' : '点击查看 Agent 介绍 / 能力配置'}
              placement="bottom"
              arrow
            >
              <Avatar
                src={isGroupChat ? undefined : (avatarSrc || undefined)}
                onClick={isGroupChat || isCEO ? undefined : handleHeadAvatarClick}
                sx={{
                  bgcolor: isGroupChat ? (groupConfig?.color || '#ff6d00') : isCEO ? '#7c4dff' : '#1976d2',
                  width: 40,
                  height: 40,
                  cursor: isGroupChat || isCEO ? 'default' : 'pointer',
                  '&:hover': isGroupChat || isCEO ? {} : { boxShadow: '0 0 0 3px rgba(25,118,210,0.25)' },
                }}
              >
                {isGroupChat ? (groupConfig?.icon || <GroupIcon />) : (resolved?.avatarFallback || contact?.name?.charAt(0) || '?')}
              </Avatar>
            </Tooltip>
          );
        })()}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography fontWeight={600} fontSize="0.95rem" component="span">
            {(() => {
              const resolved = !isGroupChat && contact
                ? resolveAgentDisplay(contact.id, contact.name, contact.name.charAt(0), profileOverride)
                : null;
              return resolved?.displayName || (isGroupChat ? (groupConfig?.name || 'AI Team 工作群') : contact?.name || '');
            })()}
            {isGroupChat && (
              <Chip
                label={`${groupMemberCount}人`}
                size="small"
                sx={{ ml: 1, height: 18, fontSize: '0.6rem', bgcolor: groupConfig?.color || '#ff6d00', color: 'white' }}
              />
            )}
            {isGroupChat && isDemoAccount() && tokenBalance !== undefined && tokenBalance >= 0 && (
              <Chip
                label={`${safeNumber(tokenBalance)} PT`}
                size="small"
                sx={{
                  ml: 0.5, height: 18, fontSize: '0.6rem',
                  bgcolor: tokenBalance <= 0 ? '#ef4444' : tokenBalance < 1000 ? '#f59e0b' : '#10b981',
                  color: 'white',
                }}
              />
            )}
            {isCEO && (
              <Chip
                label="主控官"
                size="small"
                sx={{ ml: 1, height: 18, fontSize: '0.6rem', bgcolor: '#7c4dff', color: 'white' }}
              />
            )}
          </Typography>
        </Box>
          <Typography variant="caption" color="text.secondary">
            {isGroupChat
              ? (groupConfig?.description || `Boss + ${groupMemberCount - 1} 个 AI Agent · CEO Agent 协调中`)
              : isCEO
                ? '虚拟公司主控官 · 传达宏观意图，协调所有 Agent'
                : contact.contact_type === 'team'
                  ? '团队成员'
                  : contact.external_type === 'supplier'
                    ? '供应商'
                    : '客户'}
            {!isGroupChat && contact.phone && ` · ${contact.phone}`}
          </Typography>
        </Box>
        {isGroupChat && (
          <Tooltip title="项目仪表板">
            <IconButton size="small" onClick={() => window.dispatchEvent(new CustomEvent('proclaw:open-project-overview'))}>
              <AutoAwesomeIcon fontSize="small" sx={{ color: groupConfig?.color || '#ff6d00' }} />
            </IconButton>
          </Tooltip>
        )}
        {isGroupChat && (
          <Tooltip title="@所有人">
            <IconButton size="small" onClick={() => setInput(prev => prev ? prev + ' @all' : '@all ')}>
              <CampaignIcon fontSize="small" sx={{ color: groupConfig?.color || '#ff6d00' }} />
            </IconButton>
          </Tooltip>
        )}
        {isCEO && (
          <Tooltip title="决策历史">
            <IconButton size="small" onClick={() => setShowDecisionHistory(!showDecisionHistory)}>
              <HistoryIcon fontSize="small" sx={{ color: showDecisionHistory ? '#7c4dff' : undefined }} />
            </IconButton>
          </Tooltip>
        )}
        {isCEO && (
          <Tooltip title="项目仪表板">
            <IconButton size="small" onClick={() => window.dispatchEvent(new CustomEvent('proclaw:open-project-overview'))}>
              <AutoAwesomeIcon fontSize="small" sx={{ color: '#7c4dff' }} />
            </IconButton>
          </Tooltip>
        )}
        {!isCEO && !isGroupChat && (
          <>
            <Tooltip title="语音通话">
              <IconButton
                size="small"
                onClick={() => {
                  if (contactId && contact) {
                    desktopCallManager.startCall(contactId, contact.name, 'audio');
                    navigate('/call');
                  }
                }}
              >
                <PhoneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="视频通话">
              <IconButton
                size="small"
                onClick={() => {
                  if (contactId && contact) {
                    desktopCallManager.startCall(contactId, contact.name, 'video');
                    navigate('/call');
                  }
                }}
              >
                <VideoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        {!isGroupChat && <IconButton size="small"><MoreIcon fontSize="small" /></IconButton>}
      </Paper>

      {/* 消息列表 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: '#f5f5f5',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        {groupedMessages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {isGroupChat ? 'AI Team 工作群暂无消息。等待 CEO Agent 开始分派任务...' : isCEO ? '向 CEO Agent 描述您的业务方向或宏观目标' : '暂无消息，打个招呼吧！'}
            </Typography>
          </Box>
        ) : (
          groupedMessages.map(group => (
            <Box key={group.date}>
              {/* 日期分隔线 */}
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <Chip
                  label={group.date}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.08)',
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>

              {group.items.map(msg => {
                const isSelf = msg.from_user === 'self';
                const isSystem = msg.content_type === 'system_event';
                const isTaskDispatch = msg.content_type === 'task_dispatch';
                const isTaskUpdate = msg.content_type === 'task_update';

                // 群聊消息发言人名称
                const senderName = msg.from_user_name || (isSelf ? '我' : (groupMembers[msg.from_user]?.name || contact?.name || msg.from_user));
                const senderAvatar = isSelf ? '👑' : (groupMembers[msg.from_user]?.avatar || '🤖');
                const senderColor = isSelf ? '#ff3b30' : (isCEO ? '#7c4dff' : (isGroupChat ? '#ff6d00' : '#1976d2'));

                // 系统消息居中渲染
                if (isSystem) {
                  return (
                    <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      <Chip
                        icon={<CampaignIcon sx={{ fontSize: 14 }} />}
                        label={msg.content}
                        size="small"
                        sx={{
                          bgcolor: '#fff3e0',
                          color: '#e65100',
                          border: '1px solid #ffe0b2',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          py: 0.5,
                          height: 'auto',
                          '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                        }}
                      />
                    </Box>
                  );
                }

                // 群聊任务卡片解析
                let taskCardData: TaskCardData | null = null;
                if (isGroupChat && (isTaskDispatch || isTaskUpdate)) {
                  try {
                    const parsed = JSON.parse(msg.content);
                    taskCardData = {
                      taskId: parsed.taskId || '',
                      type: parsed.type || 'task',
                      priority: parsed.priority || 5,
                      description: parsed.description || '',
                      expected_output: parsed.expected_output || parsed.output || '',
                      deadline: parsed.deadline || '',
                      assigned_to: parsed.assigned_to || '',
                      status: parsed.status,
                    };
                  } catch { taskCardData = null; }
                }

                // 非群聊的原始 TaskCard/ConfirmationCard 解析
                const legacyTaskData = !isGroupChat ? parseTaskCard(msg) : null;
                const confirmData = !isGroupChat ? parseConfirmationCard(msg) : null;

                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      flexDirection: isSelf ? 'row-reverse' : 'row',
                      gap: 1,
                      mb: 1.5,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: senderColor,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {senderAvatar}
                    </Avatar>
                    <Box sx={{ maxWidth: isGroupChat ? '75%' : '70%' }}>
                      {/* 群聊: 显示发言人名字 */}
                      {isGroupChat && !isSelf && (
                        <Typography variant="caption" fontWeight={600} sx={{ mb: 0.2, color: '#e65100', fontSize: '0.65rem', display: 'block' }}>
                          {senderName}
                        </Typography>
                      )}
                      {/* 群聊任务卡片 */}
                      {taskCardData ? (
                        <TaskCard task={taskCardData} onViewDetail={(tid) => console.log('View task:', tid)} />
                      ) : legacyTaskData && !isSelf ? (
                        <TaskCard task={legacyTaskData} onViewDetail={(tid) => console.log('View task:', tid)} />
                      ) : confirmData && !isSelf ? (
                        <ConfirmationCard
                          data={confirmData}
                          onConfirm={() => handleConfirm(confirmData)}
                          onReject={(reason) => handleReject(confirmData, reason)}
                          onModify={() => {}}
                          onSnooze={(minutes) => handleSnooze(confirmData, minutes)}
                        />
                      ) : (
                        /* 普通文本消息 */
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: isSelf ? (isGroupChat ? '#fff3e0' : '#1976d2') : 'white',
                            color: isSelf ? (isGroupChat ? 'text.primary' : 'white') : 'text.primary',
                            borderRadius: 2,
                            borderTopRightRadius: isSelf ? 0.5 : 2,
                            borderTopLeftRadius: isSelf ? 2 : 0.5,
                            border: isSelf && isGroupChat ? '1px solid #ffcc80' : undefined,
                          }}
                        >
                          <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>
                        </Paper>
                      )}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: isSelf ? 'flex-end' : 'flex-start',
                          gap: 0.5,
                          mt: 0.3,
                          px: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.disabled" fontSize="0.65rem">
                          {formatTime(msg.created_at)}
                        </Typography>
                        {isSelf && (
                          <Typography variant="caption" color="text.disabled" fontSize="0.65rem">
                            {msg.is_read ? '已读' : '未读'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* 上下文指示器 - 仅 CEO Agent */}
      <ContextIndicator contactId={contactId} />

      {/* 输入区域 */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          bgcolor: 'white',
          border: '1px solid',
          borderTop: 'none',
          borderColor: 'divider',
          borderRadius: '0 0 12px 12px',
          flexShrink: 0,
        }}
      >
        {/* AI Team 群聊快捷指令 */}
        {isGroupChat && !input.startsWith('/') && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            {AI_TEAM_COMMANDS.map(cmd => (
              <Chip
                key={cmd.label}
                label={cmd.label}
                size="small"
                variant="outlined"
                onClick={() => setInput(cmd.label)}
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  borderColor: '#ffcc80',
                  color: '#e65100',
                  '&:hover': { bgcolor: '#fff3e0' },
                }}
              />
            ))}
          </Box>
        )}

        {/* CEO Agent 快捷命令建议 */}
        {isCEO && !input.startsWith('/') && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            {CEO_COMMANDS.map(cmd => (
              <Chip
                key={cmd.label}
                label={cmd.label}
                size="small"
                variant="outlined"
                onClick={() => setInput(cmd.label)}
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  borderColor: '#ce93d8',
                  color: '#7b1fa2',
                  '&:hover': { bgcolor: '#f3e5f5' },
                }}
              />
            ))}
          </Box>
        )}

        {/* AI 思考中提示 + 停止按钮 */}
        {isGroupChat && aiResponding && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1 }}>
            <CircularProgress size={14} sx={{ color: '#ff6d00' }} />
            <Typography variant="caption" sx={{ color: '#e65100', fontStyle: 'italic', flex: 1 }}>
              CEO Agent 思考中...
            </Typography>
            <IconButton
              size="small"
              onClick={handleStopAI}
              sx={{
                p: 0.25,
                color: '#ef4444',
                '&:hover': { bgcolor: '#fef2f2' },
              }}
              title="停止 AI 思考"
            >
              <StopIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* AI 调用失败提示（出站连接错误） */}
        {isGroupChat && aiError && !aiResponding && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              px: 1.5,
              py: 0.75,
              bgcolor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: '#dc2626', fontWeight: 500, flex: 1, fontSize: '0.75rem' }}
            >
              {aiError}（30s 未响应已自动超时）
            </Typography>
            <Button
              size="small"
              onClick={handleRetryAi}
              disabled={sending || !lastUserInput}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 0.25,
                color: '#dc2626',
                textTransform: 'none',
                fontSize: '0.7rem',
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.08)' },
              }}
            >
              重试
            </Button>
            <IconButton
              size="small"
              onClick={() => setAiError(null)}
              sx={{ p: 0.25, color: '#dc2626' }}
              title="关闭提示"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Token 用完提示 */}
        {isGroupChat && isDemoAccount() && tokenBalance <= 0 && (
          <Box sx={{ mb: 1, p: 1, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca' }}>
            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 500 }}>
              Token 已用完（10,000 PT）。如需继续测试，请联系我们获取更多 Token。
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <IconButton size="small" disabled>
            <ImageIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled>
            <FileIcon fontSize="small" />
          </IconButton>
          {/* Agent 快捷操作按钮 */}
          {quickActions.length > 0 && (
            <>
              <IconButton size="small" onClick={handleActionClick}>
                <MagicIcon fontSize="small" sx={{ color: '#ff3b30' }} />
              </IconButton>
              <Menu
                anchorEl={actionAnchor}
                open={!!actionAnchor}
                onClose={() => setActionAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                {quickActions.map(group =>
                  group.actions.map(action => (
                    <MenuItem
                      key={action.id}
                      onClick={() => handleActionSelect(group.agentId, action.id)}
                    >
                      <ListItemIcon>
                        <MagicIcon fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={action.label}
                        secondary={action.description}
                      />
                    </MenuItem>
                  ))
                )}
              </Menu>
            </>
          )}
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isGroupChat && tokenBalance <= 0 && isDemoAccount() ? 'Token 已用完，无法发送消息' : isGroupChat && aiResponding ? 'CEO Agent 思考中，请稍候...' : isGroupChat ? '在 AI Team 群聊中发号施令...' : isCEO ? '向 CEO Agent 下达指令...' : '输入消息...'}
            disabled={sending || aiResponding || (isGroupChat && isDemoAccount() && tokenBalance <= 0)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#f9f9f9',
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || sending || aiResponding || (isGroupChat && isDemoAccount() && tokenBalance <= 0)}
            sx={{
              bgcolor: '#1976d2',
              color: 'white',
              '&:hover': { bgcolor: '#1565c0' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
              width: 40,
              height: 40,
            }}
          >
            {sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Paper>
    </Box>

    {/* 决策历史侧边栏 */}
    {isCEO && showDecisionHistory && (
      <DecisionHistoryPanel onClose={() => setShowDecisionHistory(false)} />
    )}
    </Box>
  );
}
