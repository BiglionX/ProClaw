import { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface AIStatusBarProps {
  insight?: string;
  /** 洞察详细内容（日报） */
  dailyReport?: string[];
}

export default function AIStatusBar({ insight, dailyReport }: AIStatusBarProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <Box
        onClick={() => insight && setReportOpen(true)}
        sx={{
          mb: 2.5,
          px: 2.5,
          py: 1.5,
          borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(255,59,48,0.05) 0%, rgba(99,102,241,0.03) 100%)',
          border: '1px solid rgba(255,59,48,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: insight ? 'pointer' : 'default',
          transition: 'all 0.2s',
          '&:hover': insight ? {
            borderColor: 'rgba(255,59,48,0.2)',
            boxShadow: '0 2px 8px rgba(255,59,48,0.06)',
          } : {},
        }}
      >
        {/* 左侧 AI 秘书头像 */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF3B30 0%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          如
        </Box>

        {/* 中间状态文字 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: '#FF3B30',
              fontSize: '0.8rem',
              mb: 0.25,
            }}
          >
            🧠 AI 小如 · 当前分析中
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#4B5563',
              fontSize: '0.78rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {insight || '正在分析你的经营数据，请稍候...'}
          </Typography>
        </Box>

        {/* 右侧更新时间 */}
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(0,0,0,0.3)',
            fontSize: '0.65rem',
            flexShrink: 0,
          }}
        >
          上次更新 2 分钟前
        </Typography>
      </Box>

      {/* AI 日报弹窗 */}
      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 0 },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            📋 AI 今日简报
          </Typography>
          <IconButton size="small" onClick={() => setReportOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {dailyReport && dailyReport.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {dailyReport.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: idx % 2 === 0 ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                    border: '1px solid',
                    borderColor: idx % 2 === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#4B5563' }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无分析数据，录入更多交易后 AI 将自动生成简报
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
