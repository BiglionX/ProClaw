import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

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
    content: '你好!我是 Proclaw 经营智能体,可以帮您管理产品、库存和销售。请问有什么可以帮助您的?',
    timestamp: new Date(),
  },
];

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // TODO: 这里将调用 AI 后端 API
    // 现在使用模拟响应
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '收到您的指令!我正在处理中... (这是模拟响应,实际将连接到 AI 后端)',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* 消息列表 */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 3,
          backgroundColor: '#fafafa',
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              gap: 2,
              mb: 2,
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: message.role === 'user' ? '#1976d2' : '#2e7d32',
                flexShrink: 0,
              }}
            >
              {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: message.role === 'user' ? '#e3f2fd' : '#ffffff',
                border: '1px solid',
                borderColor: message.role === 'user' ? '#bbdefb' : '#e0e0e0',
                borderRadius: 2,
                maxWidth: '70%',
              }}
            >
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {message.content}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  color: 'text.secondary',
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
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#2e7d32' }}>
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
              <CircularProgress size={20} />
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
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的指令,例如:查询库存、添加新产品、分析销售趋势..."
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
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
              width: 48,
              height: 48,
              alignSelf: 'flex-end',
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 1,
            color: 'text.secondary',
            textAlign: 'center',
          }}
        >
          按 Enter 发送,Shift + Enter 换行
        </Typography>
      </Box>
    </Paper>
  );
}
