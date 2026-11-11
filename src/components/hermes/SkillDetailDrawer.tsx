/**
 * SkillDetailDrawer — 技能详情侧滑抽屉
 *
 * 单击技能树里的某条时弹出。展示:
 *  - 完整元数据(name/description/source/status/version)
 *  - 触发短语(高亮)
 *  - 工具模板(可点击测试)
 *  - systemPromptAddition(折叠展示)
 *  - 进化链(若有 parentVersion)
 *  - 操作按钮:激活 / 归档 / 拒绝 / 删除(根据 status 切换)
 */

import { useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import type { Skill } from '../../lib/hermes';
import { useHermesApi } from './useHermesApi';

interface SkillDetailDrawerProps {
  skill: Skill | null;
  open: boolean;
  onClose: () => void;
  /** 操作完成后让上层刷新列表 */
  onChanged?: () => void;
}

export function SkillDetailDrawer({ skill, open, onClose, onChanged }: SkillDetailDrawerProps) {
  const api = useHermesApi();
  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>(
    { open: false, msg: '', severity: 'success' },
  );

  if (!skill) return null;

  const showToast = (msg: string, severity: 'success' | 'error' = 'success') =>
    setToast({ open: true, msg, severity });

  const handleApprove = async () => {
    try {
      await api.approveSkill(skill.id);
      showToast('已激活');
      onChanged?.();
    } catch (e) {
      showToast(`失败:${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  const handleReject = async () => {
    try {
      await api.rejectSkill(skill.id);
      showToast('已拒绝');
      onChanged?.();
    } catch (e) {
      showToast(`失败:${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  const handleArchive = async () => {
    try {
      await api.archiveSkill(skill.id);
      showToast('已归档');
      onChanged?.();
    } catch (e) {
      showToast(`失败:${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  const handleReactivate = async () => {
    try {
      await api.reactivateSkill(skill.id);
      showToast('已重新激活');
      onChanged?.();
    } catch (e) {
      showToast(`失败:${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  const successRate = skill.usageCount > 0 ? (skill.successCount / skill.usageCount) * 100 : 0;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        // MUI v5 用 PaperProps 而不是 v6 的 slotProps
        PaperProps={{
          sx: { width: { xs: '100%', sm: 480 } },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography variant="h6">{skill.name}</Typography>
                <Chip
                  label={`v${skill.version}${skill.parentVersion ? ` ← v${skill.parentVersion}` : ''}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={skill.source}
                  size="small"
                  color={skill.source === 'preset' ? 'default' : 'primary'}
                />
                <Chip
                  label={skill.status}
                  size="small"
                  color={
                    skill.status === 'active' ? 'success' : skill.status === 'pending_review' ? 'warning' : 'default'
                  }
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                ID:{skill.id}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 描述 */}
          <Typography variant="subtitle2" gutterBottom>
            描述
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {skill.description}
          </Typography>

          {/* 触发短语 */}
          <Typography variant="subtitle2" gutterBottom>
            触发短语
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2, gap: 0.5 }}>
            {skill.triggerPhrases.map((p) => (
              <Chip key={p} label={p} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>

          {/* 标签 */}
          {skill.tags.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                标签
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2, gap: 0.5 }}>
                {skill.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Stack>
            </>
          )}

          {/* 使用统计 */}
          <Typography variant="subtitle2" gutterBottom>
            使用统计
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  总使用
                </Typography>
                <Typography variant="h6">{skill.usageCount}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  成功
                </Typography>
                <Typography variant="h6" color="success.main">
                  {skill.successCount}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  失败
                </Typography>
                <Typography variant="h6" color="error.main">
                  {skill.failureCount}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  成功率
                </Typography>
                <Typography variant="h6">{successRate.toFixed(0)}%</Typography>
              </Box>
            </Stack>
          </Paper>

          {/* 工具模板 */}
          <Typography variant="subtitle2" gutterBottom>
            工具模板({skill.toolTemplates.length})
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {skill.toolTemplates.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                此技能未引用任何 Tool
              </Typography>
            ) : (
              skill.toolTemplates.map((t, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <BuildIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={500}>
                      {t.toolName}
                    </Typography>
                    {t.order !== undefined && (
                      <Chip label={`#${t.order}`} size="small" variant="outlined" />
                    )}
                  </Stack>
                  {t.whenToUse && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      何时使用:{t.whenToUse}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      display: 'block',
                      fontFamily: 'monospace',
                      bgcolor: 'action.hover',
                      p: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    {t.exampleInvocation}
                  </Typography>
                </Paper>
              ))
            )}
          </Stack>

          {/* System Prompt 补充 */}
          {skill.systemPromptAddition && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">System Prompt 补充</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                >
                  {skill.systemPromptAddition}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* 操作按钮 */}
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {skill.status === 'pending_review' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckIcon />}
                  onClick={handleApprove}
                >
                  审核通过
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={handleReject}
                >
                  拒绝
                </Button>
              </>
            )}
            {skill.status === 'active' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArchiveIcon />}
                onClick={handleArchive}
              >
                归档
              </Button>
            )}
            {skill.status === 'archived' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<UnarchiveIcon />}
                onClick={handleReactivate}
              >
                重新激活
              </Button>
            )}
          </Stack>
        </Box>
      </Drawer>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
}