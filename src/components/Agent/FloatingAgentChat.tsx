import {
  SmartToy as BotIcon,
  ExpandLess as CollapseIcon,
  Minimize as MinimizeIcon,
  OpenInFull as MaximizeIcon,
  CloseFullscreen as RestoreIcon,
  Person as PersonIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  Paper,
  Slide,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { executeCommand, parseCommand } from '../../lib/commandParser';
import { handleUserInput, checkLLMConnectionStatus, getConnectionGuideMessage, getPersonalizedRecommendations, recordUserBehavior } from '../../lib/aiGuide';
import { useAppModeStore } from '../../config/appMode';
import { getLightInitialMessage, getLightQuickCommands, queryLightAI } from '../../lib/lightAIAssistant';

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
    return isLight ? getLightQuickCommands() : [
      { label: '所有产品', command: '查询产品' },
      { label: '库存统计', command: '查询库存' },
      { label: '库存预警', command: '库存预警' },
      { label: '入库', command: '入库' },
    ];
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

export default function FloatingAgentChat({ teamContext, onClose }: FloatingAgentChatProps = {}) {
  const mode = useAppModeStore(state => state.mode);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  // 初始化消息 - 根据团队上下文动态生成
  const getInitialMessages = (): Message[] => {
    let content: string;
    if (teamContext) {
      content = `你好！我是 **${teamContext.teamName}** 的 AI 助手，可以帮你管理团队任务、查看工作进度、分派工作。有什么可以帮你的吗？`;
    } else if (mode === 'light') {
      content = getLightInitialMessage();
    } else {
      content = '你好!我是 ProClaw 经营智能体,可以帮您管理产品、库存和销售。请问有什么可以帮助您的?';
    }
    return [{ id: '1', role: 'assistant' as const, content, timestamp: new Date() }];
  };

  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  useEffect(() => {
    if (isOpen && messages.length === 1) {
      checkLLMAndGuide();
    }
  }, [isOpen]);

  const checkLLMAndGuide = async () => {
    try {
      const status = await checkLLMConnectionStatus();
      if (!status.isConnected) {
        const guideMessage = await getConnectionGuideMessage();
        const guideMsg: Message = {
          id: Date.now().toString(),
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
            id: Date.now().toString(),
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
      id: Date.now().toString(),
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
      // 先检查是否是引导类问题
      const guideResult = await handleUserInput(userInput);
      
      if (guideResult.response) {
        // 引导类问题，直接返回响应
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: guideResult.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (mode === 'light') {
        // Light 版使用四库联动 AI 助手
        const result = queryLightAI(userInput);
        let responseText = result.text;
        if (result.sources.length > 0) {
          responseText += '\n\n---\n📎 参考来源：\n' + result.sources.map(s =>
            `- [${s.type}] ${s.title}`
          ).join('\n');
        }
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 业务查询，使用commandParser处理
        const command = parseCommand(userInput);
        const response = await executeCommand(command);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

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
    if (isMaximized) setIsMaximized(false);
  };

  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
  };

  return (
    <>
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
              ? '收起智能体'
              : `AI 经营智能体 ${unreadCount > 0 ? `(${unreadCount})` : ''}`
          }
        >
          <Fab
            color="default"
            onClick={toggleChat}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1200,
              width: 56,
              height: 56,
              bgcolor: unreadCount > 0 ? '#ff3b30' : '#ff3b30',
              '&:hover': {
                bgcolor: unreadCount > 0 ? '#ff5549' : '#ff5549',
              },
              boxShadow: '0 4px 12px rgba(255,59,48,0.3)',
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
            width: isMinimized ? 64 : isMaximized ? 'calc(100vw - 240px - 48px)' : windowWidth,
            height: isMinimized ? 64 : isMaximized ? 'calc(100vh - 48px)' : windowHeight,
            maxHeight: isMaximized ? 'calc(100vh - 48px)' : 'calc(100vh - 100px)',
            maxWidth: isMaximized ? 'calc(100vw - 240px - 48px)' : '100vw',
            left: isMaximized ? 240 : 'auto',
            zIndex: 1199,
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
              <Avatar sx={{ bgcolor: '#ff3b30', width: 32, height: 32 }}>
                <BotIcon />
              </Avatar>
              <Typography variant="subtitle2" fontWeight={600}>
                {teamContext ? (
                  teamContext.teamName
                ) : (
                  <>
                    AI
                    <Typography
                      component="span"
                      sx={{
                        color: '#ff3b30',
                        fontWeight: 700,
                      }}
                    >
                      claw
                    </Typography>
                  </>
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
              <BotIcon sx={{ fontSize: 24, color: '#666' }} />
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
                      flexDirection:
                        message.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar
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
                      }}
                    >
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
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: '#888',
                        fontSize: '0.9rem',
                      }}
                    >
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
    </>
  );
}
