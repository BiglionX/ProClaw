/**
 * Step 7: 实时进度
 *
 * 后端 executeImport 完成后立刻拿到 ImportResult；此处仅显示完成态与摘要。
 * 真正的大文件进度推送留待 v1.1（基于 Tauri Event）。
 *
 * v1.3 D3：当 result.failed_rows > 0 时新增"AI 帮你排查"折叠面板
 *  - 调用 generateImportGuidance 聚合错误
 *  - 展示 top 5 引导建议
 *  - 提供"查看完整错误报告"按钮（打开 ImportCenter 详情页）
 */

import DownloadIcon from '@mui/icons-material/Download';
import PsychologyIcon from '@mui/icons-material/Psychology';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { generateImportGuidance, type ImportGuidance } from '../../lib/aiGuide';
import type { ImportError, ImportTarget } from '../../lib/importers/types';

export interface Step7ResultSummary {
  batch_id: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
}

export interface Step7Props {
  running: boolean;
  current: number;
  total: number;
  /** v1.3 D3：导入完成后的结果摘要（用于 AI 排查面板） */
  result?: Step7ResultSummary | null;
  /** v1.3 D3：目标类型（用于 AI 引导生成） */
  targetType?: ImportTarget;
  /** v1.3 D3：表头列名（用于 AI 提示中的别名猜测） */
  headers?: string[];
}

const TOP_GUIDANCE_LIMIT = 5;

export function Step7Progress({ running, current, total, result, targetType = 'products', headers = [] }: Step7Props) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, [running]);

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const navigate = useNavigate();

  // v1.3 D3：调用 AI 引导聚合
  const guidance: ImportGuidance[] = useMemo(() => {
    if (!result || result.errors.length === 0) return [];
    return generateImportGuidance(targetType, result.errors, headers).slice(0, TOP_GUIDANCE_LIMIT);
  }, [result, targetType, headers]);

  const failedRows = result?.failed ?? 0;
  const showAiPanel = !running && !!result && failedRows > 0 && guidance.length > 0;

  return (
    <Box sx={{ py: 4, textAlign: 'center' }} data-testid="import-progress">
      {running ? (
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={64} />
          <Typography variant="h6">
            正在导入{'. '.repeat(dots)}
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 480 }}>
            <LinearProgress variant="determinate" value={pct} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {current} / {total}（{pct}%）
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            提示：导入过程中请勿关闭应用。
          </Typography>
        </Stack>
      ) : result ? (
        <Stack alignItems="center" spacing={2}>
          <Typography
            variant="h6"
            color={failedRows > 0 ? 'warning.main' : 'success.main'}
            data-testid="import-complete-status"
          >
            {failedRows > 0
              ? `导入完成（${result.success} 成功 / ${failedRows} 失败 / ${result.skipped} 跳过）`
              : '✓ 全部导入成功'}
          </Typography>
          {failedRows === 0 && (
            <Typography variant="body2" color="text.secondary">
              共导入 {result.success} 条数据。
            </Typography>
          )}

          {showAiPanel && (
            <Accordion
              sx={{ width: '100%', maxWidth: 720, mt: 2, textAlign: 'left' }}
              data-testid="ai-troubleshoot-panel"
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                  <PsychologyIcon color="primary" />
                  <Typography variant="subtitle1">AI 帮你排查</Typography>
                  <Chip
                    size="small"
                    label={`${guidance.length} 类问题`}
                    color="primary"
                    variant="outlined"
                    data-testid="ai-troubleshoot-count"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 2 }} data-testid="ai-troubleshoot-intro">
                  根据失败行的错误代码聚合，发现以下 {guidance.length} 类典型问题：共影响{' '}
                  {guidance.reduce((s, g) => s + g.affectedRows, 0)} 行。
                </Alert>
                <List dense disablePadding>
                  {guidance.map((g, idx) => (
                    <ListItem
                      key={g.category}
                      data-testid={`ai-guidance-item-${idx}`}
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        py: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={`#${idx + 1} ${g.category}`}
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {g.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={`影响 ${g.affectedRows} 行`}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {g.suggestion}
                      </Typography>
                      {g.aiHint && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          💡 {g.aiHint}
                        </Typography>
                      )}
                      {g.actionLabel && g.actionPath && (
                        <Button
                          size="small"
                          variant="outlined"
                          href={g.actionPath}
                          sx={{ mt: 1 }}
                          data-testid={`ai-guidance-action-${idx}`}
                        >
                          {g.actionLabel}
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      if (result?.batch_id) {
                        navigate(`/import-center/${result.batch_id}`);
                      } else {
                        navigate('/import-center');
                      }
                    }}
                    data-testid="view-full-error-report-button"
                  >
                    查看完整错误报告
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      ) : (
        <Typography variant="h6" color="success.main">
          ✓ 导入完成
        </Typography>
      )}
    </Box>
  );
}