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
} from '@mui/icons-material';
import {
  Avatar,
  Box,
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
import { Contact, Message, getContacts, getMessages, sendMessage } from '../lib/contactService';
import { agentRuntime } from '../lib/agentRuntime';
import desktopCallManager from '../services/CallManager';
import ContextIndicator from '../components/CEO/ContextIndicator';
import TaskCard, { TaskCardData } from '../components/CEO/TaskCard';
import ConfirmationCard, { ConfirmationData } from '../components/CEO/ConfirmationCard';
import DecisionHistoryPanel from '../components/CEO/DecisionHistoryPanel';
import { proclawDecision } from '../lib/ceoController';

const CEO_AGENT_ID = 'ceo-agent';

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
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null);
  const [showDecisionHistory, setShowDecisionHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isCEO = contactId === CEO_AGENT_ID;

  // 获取所有聊天上下文的快捷操作
  const quickActions = agentRuntime.getAllQuickActions('chat');

  useEffect(() => {
    loadData();
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
    try {
      const newMsg = await sendMessage('self', contactId, content);
      setMessages(prev => [...prev, newMsg]);
      scrollToBottom();
    } catch (e) {
      console.error('发送失败:', e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
        <Avatar sx={{ bgcolor: isCEO ? '#7c4dff' : '#1976d2', width: 40, height: 40 }}>
          {contact.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={600} fontSize="0.95rem">
            {contact.name}
            {isCEO && (
              <Chip
                label="主控官"
                size="small"
                sx={{ ml: 1, height: 18, fontSize: '0.6rem', bgcolor: '#7c4dff', color: 'white' }}
              />
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isCEO
              ? '虚拟公司主控官 · 传达宏观意图，协调所有 Agent'
              : contact.contact_type === 'team'
                ? '团队成员'
                : contact.external_type === 'supplier'
                  ? '供应商'
                  : '客户'}
            {contact.phone && ` · ${contact.phone}`}
          </Typography>
        </Box>
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
        {!isCEO && (
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
        <IconButton size="small"><MoreIcon fontSize="small" /></IconButton>
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
              {isCEO ? '向 CEO Agent 描述您的业务方向或宏观目标' : '暂无消息，打个招呼吧！'}
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

                // 尝试渲染不同类型的消息卡片
                const taskData = parseTaskCard(msg);
                const confirmData = parseConfirmationCard(msg);

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
                        bgcolor: isSelf ? '#ff3b30' : (isCEO ? '#7c4dff' : '#1976d2'),
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {isSelf ? '我' : contact.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ maxWidth: '70%' }}>
                      {/* 任务卡片 */}
                      {taskData && !isSelf ? (
                        <TaskCard task={taskData} onViewDetail={(tid) => console.log('View task:', tid)} />
                      ) : confirmData && !isSelf ? (
                        /* 确认卡片 */
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
                            bgcolor: isSelf ? '#1976d2' : 'white',
                            color: isSelf ? 'white' : 'text.primary',
                            borderRadius: 2,
                            borderTopRightRadius: isSelf ? 0.5 : 2,
                            borderTopLeftRadius: isSelf ? 2 : 0.5,
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
            placeholder={isCEO ? '向 CEO Agent 下达指令...' : '输入消息...'}
            disabled={sending}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#f9f9f9',
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || sending}
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
