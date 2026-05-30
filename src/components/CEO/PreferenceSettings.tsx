/**
 * CEO Agent 偏好设置面板 (PRD v6.3 第 5.3 节)
 * Boss 可手动调整偏好权重，影响 CEO Agent 的决策风格
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Slider, Paper, FormControl, InputLabel, Select, MenuItem,
  Button, Divider, CircularProgress, Chip,
} from '@mui/material';
import {
  Savings as BudgetIcon, Psychology as RiskIcon,
  AutoAwesome as StyleIcon, Refresh as ResetIcon,
} from '@mui/icons-material';
import { proclawLearning, proclawDecision, DecisionStats } from '../../lib/ceoController';

export default function PreferenceSettings() {
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prefs, statsData] = await Promise.all([
        proclawLearning.getPreferences(),
        proclawDecision.getStats(),
      ]);
      const prefMap: Record<string, string> = {};
      prefs.forEach((p) => { prefMap[p.key] = p.value; });
      setPreferences(prefMap);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load preferences:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await proclawLearning.updatePreference(key, value);
      setPreferences((prev) => ({ ...prev, [key]: value }));
      setSaveMessage('偏好已更新');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      setSaveMessage('保存失败');
      console.error('Failed to save preference:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await proclawLearning.updatePreference('budget_sensitivity', '5');
      await proclawLearning.updatePreference('risk_tolerance', '5');
      await proclawLearning.updatePreference('auto_approve_threshold', '0.85');
      await proclawLearning.updatePreference('decision_style', '"balanced"');
      setPreferences({
        budget_sensitivity: '5',
        risk_tolerance: '5',
        auto_approve_threshold: '0.85',
        decision_style: '"balanced"',
      });
      setSaveMessage('偏好已重置为默认值');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      setSaveMessage('重置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          CEO Agent 偏好设置
        </Typography>
        {saveMessage && (
          <Chip label={saveMessage} size="small" color={saveMessage.includes('失败') ? 'error' : 'success'} sx={{ height: 20, fontSize: '0.6rem' }} />
        )}
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<ResetIcon sx={{ fontSize: 14 }} />}
          onClick={handleReset}
          disabled={saving}
          sx={{ fontSize: '0.7rem' }}
        >
          重置偏好
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 决策统计 */}
      {stats && stats.total > 0 && (
        <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
            当前决策统计
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption">总决策: {stats.total}</Typography>
            <Typography variant="caption" color="success.main">接受率: {(stats.approval_rate * 100).toFixed(0)}%</Typography>
            <Typography variant="caption" color="error.main">拒绝: {stats.rejected}</Typography>
          </Box>
        </Box>
      )}

      {/* 预算敏感度 */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <BudgetIcon sx={{ fontSize: 18, color: '#f57c00' }} />
          <Typography variant="body2" fontWeight={500}>预算敏感度</Typography>
          <Typography variant="caption" color="text.secondary">
            (当前: {preferences.budget_sensitivity || '5'}/10)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
          数值越高，CEO Agent 在生成预算相关建议时越保守
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">宽松</Typography>
          <Slider
            value={Number(preferences.budget_sensitivity) || 5}
            min={1}
            max={10}
            step={1}
            marks
            onChange={(_, val) => setPreferences((prev) => ({ ...prev, budget_sensitivity: String(val) }))}
            onChangeCommitted={(_, val) => handleSave('budget_sensitivity', String(val))}
            sx={{ flex: 1, color: '#f57c00' }}
          />
          <Typography variant="caption" color="text.secondary">严格</Typography>
        </Box>
      </Box>

      {/* 风险偏好 */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <RiskIcon sx={{ fontSize: 18, color: '#7c4dff' }} />
          <Typography variant="body2" fontWeight={500}>风险偏好</Typography>
          <Typography variant="caption" color="text.secondary">
            (当前: {preferences.risk_tolerance || '5'}/10)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
          数值越高，CEO Agent 更愿意推荐有风险但高回报的策略
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">保守</Typography>
          <Slider
            value={Number(preferences.risk_tolerance) || 5}
            min={1}
            max={10}
            step={1}
            marks
            onChange={(_, val) => setPreferences((prev) => ({ ...prev, risk_tolerance: String(val) }))}
            onChangeCommitted={(_, val) => handleSave('risk_tolerance', String(val))}
            sx={{ flex: 1, color: '#7c4dff' }}
          />
          <Typography variant="caption" color="text.secondary">激进</Typography>
        </Box>
      </Box>

      {/* 自动确认阈值 */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <StyleIcon sx={{ fontSize: 18, color: '#00c853' }} />
          <Typography variant="body2" fontWeight={500}>自动确认阈值</Typography>
          <Typography variant="caption" color="text.secondary">
            (当前: {preferences.auto_approve_threshold || '0.85'})
          </Typography>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
          CEO Agent 置信度超过此值时，低风险操作将自动执行而不需要您确认
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">严格(高门槛)</Typography>
          <Slider
            value={Number(preferences.auto_approve_threshold) * 100 || 85}
            min={50}
            max={100}
            step={5}
            marks
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
            onChange={(_, val) => setPreferences((prev) => ({ ...prev, auto_approve_threshold: String(Number(val) / 100) }))}
            onChangeCommitted={(_, val) => handleSave('auto_approve_threshold', String(Number(val) / 100))}
            sx={{ flex: 1, color: '#00c853' }}
          />
          <Typography variant="caption" color="text.secondary">宽松(低门槛)</Typography>
        </Box>
      </Box>

      {/* 决策风格 */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <StyleIcon sx={{ fontSize: 18, color: '#2979ff' }} />
          <Typography variant="body2" fontWeight={500}>决策风格</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>风格</InputLabel>
          <Select
            value={preferences.decision_style ? preferences.decision_style.replace(/"/g, '') : 'balanced'}
            label="风格"
            onChange={(e) => handleSave('decision_style', `"${e.target.value}"`)}
          >
            <MenuItem value="conservative">保守型 - 偏好低风险、渐进式发展</MenuItem>
            <MenuItem value="balanced">均衡型 - 在风险和收益间平衡</MenuItem>
            <MenuItem value="aggressive">激进型 - 追求高速增长，接受高风险</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
}
