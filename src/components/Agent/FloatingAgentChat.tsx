import {
  SmartToy as BotIcon,
  Person as PersonIcon,
  Send as SendIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Minimize as MinimizeIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  Paper,
  Slide,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { executeCommand, parseCommand } from '../lib/commandParser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      '你好!我是 Proclaw 经营智能体,可以帮您管理产品、库存和销售。请问有什么可以帮助您的?',
    timestamp: new Date(),
  },
];

export default function FloatingAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const command = parseCommand(userMessage.content);
      const response = await executeCommand(command);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // 如果面板未打开,增加未读计数
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉,处理您的指令时出现了错误。请稍后重试。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    setUnreadCount(0); // 打开时清除未读计数
  };

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  return (
    <>
      {/* 浮动按钮 - 始终显示 */}
      <Slide direction="up" in={!isOpen || isMinimized} mountOnEnter unmountOnExit>
        <Tooltip title={isOpen ? '收起智能体' : `AI 经营智能体 ${unreadCount > 0 ? `(${unreadCount})` : ''}`}>
          <Fab
            color="primary"
            onClick={toggleChat}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1200,
              width: 56,
              height: 56,
              bgcolor: unreadCount > 0 ? '#ff9800' : '#1976d2',
              '&:hover': {
                bgcolor: unreadCount > 0 ? '#f57c00' : '#1565c0',
              },
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <BotIcon sx={{ fontSize: 28 }} />
              {unreadCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    bgcolor: '#f44336',
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
            width: isMinimized ? 64 : 420,
            height: isMinimized ? 64 : 600,
            maxHeight: 'calc(100vh - 100px)',
            zIndex: 1199,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: isMinimized ? '50%' : 3,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {/* 标题栏 */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#16213e',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: '#2e7d32', width: 32, height: 32 }}>
                <BotIcon />
              </Avatar>
              <Typography variant="subtitle2" fontWeight={600}>
                AI 经营智能体
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={toggleMinimize}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                {isMinimized ? <ExpandIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
              </IconButton>
              <IconButton
                size="small"
                onClick={toggleChat}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
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
              <BotIcon sx={{ fontSize: 24, color: '#1976d2' }} />
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
                {messages.map(message => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      mb: 2,
                      flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: message.role === 'user' ? '#1976d2' : '#2e7d32',
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
                        backgroundColor: message.role === 'user' ? '#e3f2fd' : '#ffffff',
                        border: '1px solid',
                        borderColor: message.role === 'user' ? '#bbdefb' : '#e0e0e0',
                        borderRadius: 2,
                        maxWidth: '80%',
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                        {message.content}
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
                ))}

                {isLoading && (
                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#2e7d32', fontSize: '0.9rem' }}>
                      <BotIcon />
                    </Avatar>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        backgroundColor: '#ffffff',
                        border: '1px solid',
                        borderColor: '#e0e0e0',
                        borderRadius: 2,
                      }}
                    >
                      <CircularProgress size={16} />
                    </Paper>
                  </Box>
                )}

                <div ref={messagesEndRef} />
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
                    color="primary"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
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
        </Paper>
      </Slide>
    </>
  );
}
