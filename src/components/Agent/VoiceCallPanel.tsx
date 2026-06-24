/**
 * 语音通话面板（任务 #3：语音通话实现）
 *
 * 全屏对话面板，提供：
 * - 录音状态指示（动画波形）
 * - 实时转写显示
 * - 文字输入兜底
 * - AI 回复 TTS 朗读
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  VolumeUp as SpeakIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeechService, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from '../../lib/speechService';

interface VoiceCallPanelProps {
  open: boolean;
  onClose: () => void;
  /** 发送消息给 AI 并获取回复 */
  onSendMessage?: (text: string) => Promise<string>;
  /** 初始问候语 */
  initialMessage?: string;
}

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  speaking?: boolean;
}

export function VoiceCallPanel({
  open,
  onClose,
  onSendMessage,
  initialMessage = '你好，我是 ProClaw 商务秘书，可以叫我「小 Pro」。有什么想了解的？',
}: VoiceCallPanelProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sttSupported] = useState(isSpeechRecognitionSupported());
  const [ttsSupported] = useState(isSpeechSynthesisSupported());
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 初始化欢迎语
  useEffect(() => {
    if (open && transcripts.length === 0) {
      setTranscripts([
        {
          id: `init-${Date.now()}`,
          role: 'assistant',
          text: initialMessage,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [open, initialMessage, transcripts.length]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimText]);

  // 关闭时清理
  useEffect(() => {
    if (!open) {
      SpeechService.abortListening();
      SpeechService.stopSpeaking();
      setIsListening(false);
      setInterimText('');
      setAudioLevel(0);
    }
  }, [open]);

  // 模拟音频波形（实际接入 AudioContext 可获得真实电平）
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      // 模拟电平波动
      audioLevelRef.current = Math.max(0.1, Math.random());
      setAudioLevel(audioLevelRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isListening]);

  // 开始/停止语音识别
  const toggleListening = () => {
    if (isListening) {
      SpeechService.stopListening();
      setIsListening(false);
      setInterimText('');
    } else {
      const success = SpeechService.startListening(
        (result) => {
          if (result.isFinal) {
            // 最终结果：填充输入框或直接发送
            setTextInput(result.transcript);
            setInterimText('');
            // 自动发送
            handleSend(result.transcript);
          } else {
            // 临时结果：显示在输入框
            setInterimText(result.transcript);
          }
        },
        (error) => {
          console.warn('Speech recognition error:', error);
          setIsListening(false);
          setInterimText('');
        },
        () => {
          setIsListening(false);
          setInterimText('');
        }
      );
      if (success) {
        setIsListening(true);
      }
    }
  };

  // 发送消息
  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? textInput).trim();
    if (!text || isProcessing) return;

    const userEntry: TranscriptEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setTranscripts(prev => [...prev, userEntry]);
    setTextInput('');
    setIsProcessing(true);

    try {
      // 调用 AI 回调
      const reply = onSendMessage
        ? await onSendMessage(text)
        : `收到您的消息：「${text}」\n\n当前演示模式未配置 AI 回调，请连接 ProClaw LLM 服务。`;

      const assistantEntry: TranscriptEntry = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: Date.now(),
      };
      setTranscripts(prev => [...prev, assistantEntry]);

      // TTS 朗读回复
      if (ttsSupported) {
        setTranscripts(prev =>
          prev.map(t =>
            t.id === assistantEntry.id ? { ...t, speaking: true } : t
          )
        );
        SpeechService.speak(reply, {
          rate: 1.1,
          onEnd: () => {
            setTranscripts(prev =>
              prev.map(t =>
                t.id === assistantEntry.id ? { ...t, speaking: false } : t
              )
            );
          },
        });
      }
    } catch (err) {
      setTranscripts(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `抱歉，处理出错：${err instanceof Error ? err.message : '未知错误'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 停止朗读
  const stopSpeaking = () => {
    SpeechService.stopSpeaking();
    setTranscripts(prev => prev.map(t => ({ ...t, speaking: false })));
  };

  // 波形条
  const renderWaveform = () => {
    const bars = Array.from({ length: 5 });
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: 40 }}>
        {bars.map((_, i) => {
          const phase = (Date.now() / 200 + i * 0.5) % (Math.PI * 2);
          const baseHeight = isListening ? 8 + Math.abs(Math.sin(phase)) * 24 * audioLevel : 4;
          return (
            <motion.div
              key={i}
              animate={{
                height: isListening ? baseHeight : 4,
                backgroundColor: isListening ? '#FF3B30' : 'rgba(255,255,255,0.3)',
              }}
              transition={{ duration: 0.1 }}
              style={{
                width: 4,
                borderRadius: 2,
                height: 4,
              }}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2D5F 100%)',
          color: '#fff',
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '70vh', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部状态栏 */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            如
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              语音通话 · 小 Pro
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={isListening ? '🔴 正在聆听' : '💤 待机'}
                sx={{
                  bgcolor: isListening ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.7rem',
                }}
              />
              {!sttSupported && (
                <Chip
                  size="small"
                  label="语音输入不可用"
                  sx={{
                    bgcolor: 'rgba(255,59,48,0.15)',
                    color: '#FF8060',
                    fontSize: '0.7rem',
                  }}
                />
              )}
              {!ttsSupported && (
                <Chip
                  size="small"
                  label="语音播报不可用"
                  sx={{
                    bgcolor: 'rgba(255,59,48,0.15)',
                    color: '#FF8060',
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* 对话区域 */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <AnimatePresence>
            {transcripts.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', justifyContent: entry.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor:
                      entry.role === 'user'
                        ? 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)'
                        : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  {entry.text}
                  {entry.speaking && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 1, gap: 0.5 }}>
                      <SpeakIcon sx={{ fontSize: 14, color: '#FF8060' }} />
                      <Typography variant="caption" sx={{ color: '#FF8060' }}>
                        朗读中
                      </Typography>
                    </Box>
                  )}
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>

          {interimText && (
            <Box sx={{ alignSelf: 'flex-end', opacity: 0.6 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                正在识别: {interimText}...
              </Typography>
            </Box>
          )}

          {isProcessing && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={16} sx={{ color: '#FF6B6B' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  思考中...
                </Typography>
              </Box>
            </Box>
          )}
          <div ref={chatEndRef} />
        </Box>

        {/* 底部输入区 */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* 录音波形 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {renderWaveform()}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {ttsSupported && (
                <Tooltip title="停止朗读">
                  <IconButton
                    onClick={stopSpeaking}
                    sx={{ color: 'rgba(255,255,255,0.5)' }}
                    size="small"
                  >
                    <StopIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* 输入框 + 按钮 */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <Tooltip title={sttSupported ? (isListening ? '停止录音' : '开始语音输入') : '当前浏览器不支持语音输入'}>
              <span>
                <IconButton
                  onClick={toggleListening}
                  disabled={!sttSupported || isProcessing}
                  sx={{
                    bgcolor: isListening ? 'rgba(255,59,48,0.3)' : 'rgba(255,255,255,0.05)',
                    color: isListening ? '#FF6B6B' : '#fff',
                    '&:hover': { bgcolor: 'rgba(255,59,48,0.2)' },
                    '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  {isListening ? <MicOffIcon /> : <MicIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <TextField
              fullWidth
              multiline
              maxRows={3}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? '正在聆听...' : '输入消息或点击麦克风说话'}
              disabled={isListening || isProcessing}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#FF3B30' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)' },
              }}
            />

            <IconButton
              onClick={() => handleSend()}
              disabled={!textInput.trim() || isProcessing}
              sx={{
                bgcolor: '#FF3B30',
                color: '#fff',
                '&:hover': { bgcolor: '#D32F2F' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>

          {/* 提示 */}
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            Enter 发送 · Shift+Enter 换行 · 推荐使用 Chrome 浏览器
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default VoiceCallPanel;
