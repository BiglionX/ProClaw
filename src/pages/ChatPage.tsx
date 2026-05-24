import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Image as ImageIcon,
  AttachFile as FileIcon,
  MoreVert as MoreIcon,
  Phone as PhoneIcon,
  Videocam as VideoIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Contact, Message, getContacts, getMessages, sendMessage } from '../lib/contactService';
import desktopCallManager from '../services/CallManager';

export default function ChatPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>
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
        <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}>
          {contact.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={600} fontSize="0.95rem">{contact.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {contact.contact_type === 'team' ? '团队成员' : contact.external_type === 'supplier' ? '供应商' : '客户'}
            {contact.phone && ` · ${contact.phone}`}
          </Typography>
        </Box>
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
            <Typography color="text.secondary">暂无消息，打个招呼吧！</Typography>
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
                        bgcolor: isSelf ? '#ff3b30' : '#1976d2',
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {isSelf ? '我' : contact.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ maxWidth: '70%' }}>
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
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          {msg.content}
                        </Typography>
                      </Paper>
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <IconButton size="small" disabled>
            <ImageIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled>
            <FileIcon fontSize="small" />
          </IconButton>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
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
  );
}
