/**
 * 知识库问答输入栏（任务 #4：AI 知识库智能问答）
 *
 * 提供"向知识库提问"入口（PRD v11.0 §4.4.2）
 * 支持文字输入 → AI 生成引用答案
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as SparkleIcon,
  Close as CloseIcon,
  Source as SourceIcon,
  BookOutlined as BookIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { knowledgeQA, type KnowledgeAnswer } from '../../lib/knowledgeQA';
import { getKnowledgeDocuments } from '../../lib/knowledgeBaseService';

interface AskKnowledgeBarProps {
  /** 自定义样式 */
  sx?: any;
}

interface QAHistoryItem {
  id: string;
  question: string;
  answer: KnowledgeAnswer;
  timestamp: number;
}

export function AskKnowledgeBar({ sx }: AskKnowledgeBarProps) {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<KnowledgeAnswer | null>(null);
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 提交问题
  const handleAsk = async () => {
    const q = question.trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    setError(null);
    setCurrentAnswer(null);

    try {
      const documents = getKnowledgeDocuments({ active_only: true });
      const answer = await knowledgeQA.ask(q, documents);

      setCurrentAnswer(answer);
      setHistory(prev => [
        {
          id: `qa-${Date.now()}`,
          question: q,
          answer,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 5)); // 保留最近 5 条
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '问答出错');
    } finally {
      setIsAsking(false);
    }
  };

  // 关闭当前答案
  const closeAnswer = () => {
    setCurrentAnswer(null);
  };

  return (
    <Box sx={sx}>
      {/* 输入栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'rgba(99,102,241,0.2)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(255,59,48,0.02) 100%)',
        }}
      >
        <SparkleIcon sx={{ color: '#6366F1', ml: 1 }} />
        <TextField
          fullWidth
          size="small"
          variant="standard"
          placeholder="🔍 向知识库提问，例如：退换货政策是什么？"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          disabled={isAsking}
          InputProps={{ disableUnderline: true }}
        />
        <IconButton
          onClick={handleAsk}
          disabled={!question.trim() || isAsking}
          sx={{
            bgcolor: '#6366F1',
            color: '#fff',
            '&:hover': { bgcolor: '#4F46E5' },
            '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.2)' },
          }}
        >
          {isAsking ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <SendIcon />}
        </IconButton>
      </Paper>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 当前答案展示 */}
      <AnimatePresence>
        {currentAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'rgba(99,102,241,0.2)',
                bgcolor: 'rgba(99,102,241,0.02)',
              }}
            >
              {/* 标题栏 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <SparkleIcon sx={{ color: '#6366F1', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                  AI 回答
                </Typography>
                <Chip
                  size="small"
                  label={`置信度 ${(currentAnswer.confidence * 100).toFixed(0)}%`}
                  color={currentAnswer.confidence > 0.7 ? 'success' : currentAnswer.confidence > 0.4 ? 'warning' : 'default'}
                  sx={{ height: 22, fontSize: '0.7rem', mr: 1 }}
                />
                <IconButton size="small" onClick={closeAnswer}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* 答案内容 */}
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'text.primary' }}
              >
                {currentAnswer.text}
              </Typography>

              {/* 关键发现 */}
              {currentAnswer.keyFindings.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                    💡 关键发现
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {currentAnswer.keyFindings.map((finding, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={finding}
                        sx={{ bgcolor: 'rgba(16,185,129,0.1)', fontSize: '0.7rem' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 来源引用 */}
              {currentAnswer.citations.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    <SourceIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                    来源引用（{currentAnswer.citations.length}）
                  </Typography>
                  <Stack spacing={0.5}>
                    {currentAnswer.citations.map((cite, i) => (
                      <Paper
                        key={cite.id}
                        variant="outlined"
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'rgba(255,255,255,0.5)',
                          borderColor: 'rgba(99,102,241,0.1)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            size="small"
                            label={`[${i + 1}]`}
                            sx={{ bgcolor: '#6366F1', color: '#fff', fontSize: '0.65rem', height: 18 }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                            {cite.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={`相关度 ${(cite.relevance * 100).toFixed(0)}%`}
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </Box>
                        {cite.snippet && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              color: 'text.secondary',
                              fontStyle: 'italic',
                            }}
                          >
                            "{cite.snippet.length > 100 ? cite.snippet.substring(0, 100) + '...' : cite.snippet}"
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 元信息 */}
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  耗时 {currentAnswer.durationMs.toFixed(0)}ms
                </Typography>
                {currentAnswer.model && (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    · {currentAnswer.model}
                  </Typography>
                )}
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 历史问答 */}
      {history.length > 0 && !currentAnswer && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            <BookIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            最近问答
          </Typography>
          <Stack spacing={1}>
            {history.map(item => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.04)' },
                }}
                onClick={() => setCurrentAnswer(item.answer)}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.question}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.answer.citations.length} 个来源 · 置信度 {(item.answer.confidence * 100).toFixed(0)}%
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* 空状态引导 */}
      {history.length === 0 && !currentAnswer && !isAsking && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            💡 上传业务文档到资料库后，可在此向 AI 提问
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default AskKnowledgeBar;
