import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close,
  DeleteSweep,
  TrendingUp,
  NotificationImportant,
  Schedule,
  School,
  DragHandle,
} from '@mui/icons-material';
import { loadBap, saveBapRecord, resetBapLearning } from '../../lib/secretaryBap';
import type { BapRecord } from '../../types/secretary';

interface BapSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

/** 预设 KPI 列表 */
const ALL_KPIS = [
  { key: 'revenue', label: '营收', defaultPriority: 1 },
  { key: 'gross_margin', label: '毛利率', defaultPriority: 2 },
  { key: 'inventory_turnover', label: '库存周转', defaultPriority: 3 },
  { key: 'refund_rate', label: '退货率', defaultPriority: 4 },
  { key: 'sales_volume', label: '销量排行', defaultPriority: 5 },
  { key: 'order_pending', label: '待处理订单', defaultPriority: 6 },
];

/** 预设预警 */
const DEFAULT_ALERTS: Array<{ key: string; label: string; defaultThreshold: number; unit: string }> = [
  { key: 'stock_low', label: '库存低于', defaultThreshold: 10, unit: '件' },
  { key: 'margin_drop', label: '毛利率下滑超过', defaultThreshold: 5, unit: '%' },
  { key: 'refund_rate_high', label: '退货率高于', defaultThreshold: 8, unit: '%' },
];

/** 预设简报 */
const DEFAULT_ROUTINES: Array<{ key: string; label: string; type: string }> = [
  { key: 'daily_brief', label: '每日简报', type: 'daily_brief' },
  { key: 'weekly_report', label: '周报', type: 'weekly_report' },
  { key: 'monthly_compare', label: '月度对比', type: 'monthly_compare' },
];

export default function BapSettingsPanel({ open, onClose, onSettingsChanged }: BapSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 关注指标
  const [kpiEnabled, setKpiEnabled] = useState<Record<string, boolean>>({});
  const [kpiPriorities, setKpiPriorities] = useState<Record<string, number>>({});
  
  // 预警阈值
  const [alertValues, setAlertValues] = useState<Record<string, number>>({});
  const [alertEnabled, setAlertEnabled] = useState<Record<string, boolean>>({});
  
  // 简报推送
  const [routineEnabled, setRoutineEnabled] = useState<Record<string, boolean>>({});
  const [dailyBriefTime, setDailyBriefTime] = useState('09:00');
  
  // 学习记录
  const [learnedRecords, setLearnedRecords] = useState<BapRecord[]>([]);
  const [resetting, setResetting] = useState(false);

  // 加载 BAP 数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allRecords = await loadBap();
      
      // 关注指标
      const kpis = allRecords.filter(r => r.profile_type === 'kpi_preference');
      const kpiEnabledMap: Record<string, boolean> = {};
      const kpiPriorityMap: Record<string, number> = {};
      for (const kpi of ALL_KPIS) {
        const record = kpis.find(r => r.key === kpi.key);
        kpiEnabledMap[kpi.key] = !!record;
        kpiPriorityMap[kpi.key] = record ? (JSON.parse(record.value as string)?.priority ?? kpi.defaultPriority) : kpi.defaultPriority;
      }
      setKpiEnabled(kpiEnabledMap);
      setKpiPriorities(kpiPriorityMap);

      // 预警阈值
      const alerts = allRecords.filter(r => r.profile_type === 'alert_threshold');
      const alertValueMap: Record<string, number> = {};
      const alertEnableMap: Record<string, boolean> = {};
      for (const alert of DEFAULT_ALERTS) {
        const record = alerts.find(r => r.key === alert.key);
        alertValueMap[alert.key] = record ? (JSON.parse(record.value as string)?.threshold ?? alert.defaultThreshold) : alert.defaultThreshold;
        alertEnableMap[alert.key] = !!record;
      }
      setAlertValues(alertValueMap);
      setAlertEnabled(alertEnableMap);

      // 简报
      const routines = allRecords.filter(r => r.profile_type === 'time_routine');
      const routineEnableMap: Record<string, boolean> = {};
      for (const r of DEFAULT_ROUTINES) {
        const record = routines.find(rr => rr.key === r.key);
        routineEnableMap[r.key] = !!record;
        if (r.key === 'daily_brief' && record) {
          try {
            const val = JSON.parse(record.value as string);
            if (val.time) setDailyBriefTime(val.time);
          } catch {}
        }
      }
      setRoutineEnabled(routineEnableMap);

      // 学习记录
      const learned = allRecords.filter(r => r.source === 'observed');
      setLearnedRecords(learned);
    } catch (err) {
      console.error('Failed to load BAP data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  // 保存KPI配置
  const saveKpi = async (key: string, enabled: boolean) => {
    setSaving(true);
    try {
      if (enabled) {
        await saveBapRecord('kpi_preference', key, { kpi: key, priority: kpiPriorities[key] ?? 1, confidence: 1.0 }, 1.0, 'explicit');
      } else {
        // 删除该KPI记录
        const records = await loadBap('kpi_preference');
        const target = records.find(r => r.key === key);
        if (target) {
          // 简单通过 upsert 不处理删除，改用 deleteByType 加过滤不合适，走重置机制
          await saveBapRecord('kpi_preference', key, {}, 0, 'explicit');
        }
      }
      onSettingsChanged?.();
    } finally {
      setSaving(false);
    }
  };

  // 保存预警配置
  const saveAlert = async (key: string, value: number, enabled: boolean) => {
    setSaving(true);
    try {
      if (enabled) {
        await saveBapRecord('alert_threshold', key, { threshold: value, unit: DEFAULT_ALERTS.find(a => a.key === key)?.unit ?? '' }, 1.0, 'explicit');
      } else {
        // 删除
        await saveBapRecord('alert_threshold', key, {}, 0, 'explicit');
      }
      onSettingsChanged?.();
    } finally {
      setSaving(false);
    }
  };

  // 保存简报配置
  const saveRoutine = async (key: string, enabled: boolean) => {
    setSaving(true);
    try {
      if (enabled) {
        const value: Record<string, unknown> = { enabled: true };
        if (key === 'daily_brief') value.time = dailyBriefTime;
        await saveBapRecord('time_routine', key, value, 1.0, 'explicit');
      } else {
        await saveBapRecord('time_routine', key, {}, 0, 'explicit');
      }
      onSettingsChanged?.();
    } finally {
      setSaving(false);
    }
  };

  // 重置学习
  const handleResetLearning = async () => {
    setResetting(true);
    try {
      await resetBapLearning();
      setLearnedRecords([]);
      onSettingsChanged?.();
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={600}>📊 关注设置</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 1 }}>
            {/* 1. 关注指标 */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp fontSize="small" /> 我关注的指标
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                勾选您关心的指标，秘书将按优先级排序呈报。
              </Typography>
              <List dense disablePadding>
                {ALL_KPIS.map((kpi) => (
                  <ListItem key={kpi.key} sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DragHandle sx={{ color: 'text.disabled', fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={kpi.label}
                      secondary={`优先级: ${kpiPriorities[kpi.key] ?? kpi.defaultPriority}`}
                    />
                    <Switch
                      size="small"
                      checked={!!kpiEnabled[kpi.key]}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setKpiEnabled(prev => ({ ...prev, [kpi.key]: enabled }));
                        saveKpi(kpi.key, enabled);
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Divider />

            {/* 2. 自动预警 */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <NotificationImportant fontSize="small" /> 自动预警
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                设置预警阈值，当指标异常时秘书会主动提醒您。
              </Typography>
              {DEFAULT_ALERTS.map((alert) => (
                <Box key={alert.key} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{alert.label}</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={!!alertEnabled[alert.key]}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setAlertEnabled(prev => ({ ...prev, [alert.key]: enabled }));
                            saveAlert(alert.key, alertValues[alert.key] ?? alert.defaultThreshold, enabled);
                          }}
                        />
                      }
                      label=""
                    />
                  </Box>
                  {alertEnabled[alert.key] && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 1 }}>
                      <Slider
                        size="small"
                        value={alertValues[alert.key] ?? alert.defaultThreshold}
                        onChange={(_, val) => setAlertValues(prev => ({ ...prev, [alert.key]: val as number }))}
                        onChangeCommitted={(_, val) => saveAlert(alert.key, val as number, true)}
                        min={1}
                        max={100}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="caption" sx={{ minWidth: 50, textAlign: 'right' }}>
                        {alertValues[alert.key] ?? alert.defaultThreshold}{alert.unit}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>

            <Divider />

            {/* 3. 简报推送 */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Schedule fontSize="small" /> 简报推送
              </Typography>
              {DEFAULT_ROUTINES.map((r) => (
                <Box key={r.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">{r.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {r.key === 'daily_brief' && routineEnabled[r.key] && (
                      <TextField
                        type="time"
                        size="small"
                        value={dailyBriefTime}
                        onChange={(e) => setDailyBriefTime(e.target.value)}
                        onBlur={() => saveRoutine(r.key, true)}
                        sx={{ width: 120 }}
                        inputProps={{ sx: { fontSize: '0.8rem', py: 0.5 } }}
                      />
                    )}
                    <Switch
                      size="small"
                      checked={!!routineEnabled[r.key]}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setRoutineEnabled(prev => ({ ...prev, [r.key]: enabled }));
                        saveRoutine(r.key, enabled);
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider />

            {/* 4. 学习记录 */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <School fontSize="small" /> 学习记录
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                以下是从您使用行为中学到的偏好数据（只读）。秘书会越来越懂您关注的指标。
              </Typography>
              {learnedRecords.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                  暂无学习数据，多和秘书聊天她会慢慢了解您的关注偏好
                </Typography>
              ) : (
                <List dense disablePadding>
                  {learnedRecords.slice(0, 10).map((record) => (
                    <ListItem key={record.id} sx={{ px: 0, py: 0.3 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <Chip label={record.source} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#e3f2fd' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={record.key}
                        secondary={`置信度: ${(record.confidence * 100).toFixed(0)}% | 最近匹配: ${record.last_matched_at ? new Date(record.last_matched_at * 1000).toLocaleDateString('zh-CN') : '从未'}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteSweep />}
                  onClick={handleResetLearning}
                  disabled={resetting || learnedRecords.length === 0}
                >
                  {resetting ? '重置中...' : '重置学习'}
                </Button>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1, display: 'block' }}>
                重置学习将清空秘书观察到的所有偏好数据，但不影响您手动设置的指标和预警。
              </Typography>
            </Box>
          </Box>
        )}
        {saving && (
          <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
