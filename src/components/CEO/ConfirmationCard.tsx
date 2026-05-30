/**
 * 确认卡片组件 (PRD v6.3)
 * CEO Agent 在执行关键操作前请求 Boss 确认
 * 支持：确认/拒绝(含原因)/编辑/稍后提醒 + 键盘快捷键
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Chip,
} from '@mui/material';
import {
  WarningAmber as WarnIcon, CheckCircle as ConfirmIcon, Cancel as RejectIcon,
  Edit as EditIcon, Schedule as SnoozeIcon, Keyboard as KeyIcon,
} from '@mui/icons-material';

export interface ConfirmationData {
  /** 操作类型 */
  actionType: 'update_pcp' | 'dispatch_task' | 'other';
  /** AI 解析出的意图摘要 */
  intentSummary: string;
  /** 将要执行的操作描述 */
  actionDescription: string;
  /** 影响的条目或对象详情 */
  details: Record<string, unknown>;
  /** 预估影响（可选） */
  estimatedImpact?: {
    budget?: string;
    hours?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  };
  /** 引用的 PCP 条目（可选） */
  pcpReferences?: Array<{
    id: string;
    type: string;
    title: string;
  }>;
  /** 决策唯一 ID（用于日志记录） */
  decisionId?: string;
}

interface ConfirmationCardProps {
  data: ConfirmationData;
  onConfirm: () => void;
  onReject: (reason?: string) => void;
  onModify?: () => void;
  onSnooze?: (minutes: number) => void;
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: '低风险', color: '#4caf50' },
  medium: { label: '中风险', color: '#ff9800' },
  high: { label: '高风险', color: '#f44336' },
};

const ACTION_LABELS: Record<string, string> = {
  update_pcp: '更新项目上下文',
  dispatch_task: '分派任务',
  other: '执行操作',
};

export default function ConfirmationCard({
  data, onConfirm, onReject, onModify, onSnooze,
}: ConfirmationCardProps) {
  const actionLabel = ACTION_LABELS[data.actionType] || '执行操作';

  // 拒绝对话框状态
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');

  // 稍后提醒对话框状态
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState(30);

  // 初始化编辑内容
  useEffect(() => {
    setEditContent(JSON.stringify(data.details, null, 2));
  }, [data.details]);

  // 键盘快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 只在没有打开对话框时响应快捷键
    if (rejectDialogOpen || editDialogOpen || snoozeDialogOpen) return;

    // 不要拦截输入框中的按键
    if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 'y':
        e.preventDefault();
        onConfirm();
        break;
      case 'n':
        e.preventDefault();
        setRejectDialogOpen(true);
        break;
      case 'e':
        e.preventDefault();
        onModify?.();
        setEditDialogOpen(true);
        break;
      case 's':
        e.preventDefault();
        setSnoozeDialogOpen(true);
        break;
    }
  }, [onConfirm, onModify, rejectDialogOpen, editDialogOpen, snoozeDialogOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 拒绝提交
  const handleRejectSubmit = () => {
    onReject(rejectReason);
    setRejectDialogOpen(false);
    setRejectReason('');
  };

  // 编辑提交
  const handleEditSubmit = () => {
    try {
      const parsed = JSON.parse(editContent);
      data.details = parsed;
    } catch {
      // 如果 JSON 解析失败，使用原始文本
    }
    onConfirm();
    setEditDialogOpen(false);
  };

  // 稍后提醒提交
  const handleSnoozeSubmit = () => {
    onSnooze?.(snoozeMinutes);
    setSnoozeDialogOpen(false);
  };

  const riskInfo = data.estimatedImpact?.riskLevel
    ? RISK_LABELS[data.estimatedImpact.riskLevel]
    : null;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: '#ffd54f',
          bgcolor: '#fffde7',
          maxWidth: 380,
          position: 'relative',
        }}
      >
        {/* 快捷键提示 */}
        <Box
          sx={{
            position: 'absolute', top: 4, right: 4,
            display: 'flex', gap: 0.3, opacity: 0.5,
          }}
        >
          <KeyIcon sx={{ fontSize: 10 }} />
        </Box>

        {/* 标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WarnIcon sx={{ fontSize: 20, color: '#f57c00' }} />
          <Typography variant="subtitle2" fontWeight={600} color="#e65100">
            需要确认: {actionLabel}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1 }} />

        {/* 意图摘要 */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          解析到的意图:
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5, bgcolor: '#fff8e1', p: 1, borderRadius: 1, border: '1px solid #fff9c4' }}>
          "{data.intentSummary}"
        </Typography>

        {/* 操作描述 */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          即将执行的操作:
        </Typography>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
          {data.actionDescription}
        </Typography>

        {/* 详情展示 */}
        {Object.keys(data.details).length > 0 && (
          <Box sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 1 }}>
            {Object.entries(data.details).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', gap: 1, mb: 0.3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                  {key}:
                </Typography>
                <Typography variant="caption" fontWeight={500}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* 预估影响 */}
        {data.estimatedImpact && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              预估影响:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
              {data.estimatedImpact.budget && (
                <Chip
                  label={`预算: ${data.estimatedImpact.budget}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.6rem' }}
                />
              )}
              {data.estimatedImpact.hours && (
                <Chip
                  label={`工时: ${data.estimatedImpact.hours}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.6rem' }}
                />
              )}
              {riskInfo && (
                <Chip
                  label={riskInfo.label}
                  size="small"
                  sx={{
                    height: 20, fontSize: '0.6rem',
                    bgcolor: riskInfo.color, color: 'white', fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </>
        )}

        {/* PCP 引用 */}
        {data.pcpReferences && data.pcpReferences.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              决策依据 (PCP 引用):
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              {data.pcpReferences.map((ref) => (
                <Chip
                  key={ref.id}
                  label={`[${ref.type}] ${ref.title}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 18, fontSize: '0.6rem', mr: 0.5, mb: 0.3,
                    borderColor: '#ffe082',
                  }}
                />
              ))}
            </Box>
          </>
        )}

        <Divider sx={{ mb: 1 }} />

        {/* 快捷键提示文字 */}
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontSize: '0.55rem' }}>
          快捷键: Y 确认 · N 拒绝 · E 编辑 · S 稍后提醒
        </Typography>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<SnoozeIcon sx={{ fontSize: 14 }} />}
            onClick={() => setSnoozeDialogOpen(true)}
            sx={{ fontSize: '0.65rem', minWidth: 'auto' }}
          >
            稍后
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
            onClick={() => { onModify?.(); setEditDialogOpen(true); }}
            sx={{ fontSize: '0.65rem', minWidth: 'auto' }}
          >
            编辑
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<RejectIcon sx={{ fontSize: 14 }} />}
            onClick={() => setRejectDialogOpen(true)}
            sx={{ fontSize: '0.65rem', minWidth: 'auto' }}
          >
            拒绝
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<ConfirmIcon sx={{ fontSize: 14 }} />}
            onClick={onConfirm}
            sx={{ fontSize: '0.65rem', minWidth: 'auto' }}
          >
            确认
          </Button>
        </Box>
      </Paper>

      {/* 拒绝原因对话框 */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>拒绝理由</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            请说明拒绝原因或提出修改建议，CEO Agent 将据此调整方案：
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={3}
            fullWidth
            placeholder="输入拒绝原因或修改建议..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} size="small">取消</Button>
          <Button onClick={handleRejectSubmit} variant="contained" color="error" size="small">
            确认拒绝
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>编辑决策内容</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            修改决策详情（JSON 格式），修改后点击"确认修改"提交：
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={6}
            fullWidth
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} size="small">取消</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary" size="small">
            确认修改并执行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 稍后提醒对话框 */}
      <Dialog open={snoozeDialogOpen} onClose={() => setSnoozeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>稍后提醒</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>提醒时间</InputLabel>
            <Select
              value={snoozeMinutes}
              label="提醒时间"
              onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
            >
              <MenuItem value={15}>15 分钟后</MenuItem>
              <MenuItem value={30}>30 分钟后</MenuItem>
              <MenuItem value={60}>1 小时后</MenuItem>
              <MenuItem value={120}>2 小时后</MenuItem>
              <MenuItem value={1440}>明天此时</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnoozeDialogOpen(false)} size="small">取消</Button>
          <Button onClick={handleSnoozeSubmit} variant="contained" size="small">
            设置提醒
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
