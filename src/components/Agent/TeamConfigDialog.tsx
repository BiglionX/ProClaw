import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface TeamConfig {
  platforms: string[];
  keywords: string[];
  cronSchedule: string;
  updatedAt: string;
}

const PLATFORM_OPTIONS = [
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'douyin', label: '抖音' },
  { value: 'meituan', label: '美团' },
  { value: 'wechat', label: '微信' },
  { value: 'kuaishou', label: '快手' },
  { value: 'bilibili', label: 'B站' },
];

const CRON_OPTIONS = [
  { value: '', label: '不设置' },
  { value: '0 8 * * *', label: '每天早上 8:00' },
  { value: '0 9 * * 1', label: '每周一 9:00' },
  { value: '0 10 1 * *', label: '每月 1 日 10:00' },
  { value: '0 */2 * * *', label: '每 2 小时' },
  { value: '0 0 * * *', label: '每天午夜 0:00' },
];

const STORAGE_PREFIX = 'team-config-';

interface TeamConfigDialogProps {
  open: boolean;
  teamName: string;
  teamId: string;
  onClose: () => void;
  onSaved?: () => void;
}

function loadConfig(teamId: string): TeamConfig | null {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + teamId);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveConfig(teamId: string, config: TeamConfig): void {
  localStorage.setItem(STORAGE_PREFIX + teamId, JSON.stringify(config));
}

export default function TeamConfigDialog({
  open,
  teamName,
  teamId,
  onClose,
  onSaved,
}: TeamConfigDialogProps) {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [cronSchedule, setCronSchedule] = useState('');

  useEffect(() => {
    if (open) {
      const existing = loadConfig(teamId);
      setPlatforms(existing?.platforms || []);
      setKeywords(existing?.keywords || []);
      setCronSchedule(existing?.cronSchedule || '');
      setKeywordInput('');
    }
  }, [open, teamId]);

  const handleTogglePlatform = (value: string) => {
    setPlatforms((prev) =>
      prev.includes(value)
        ? prev.filter((p) => p !== value)
        : [...prev, value]
    );
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      const newKeywords = keywordInput
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter(Boolean);
      setKeywords((prev) => {
        const combined = [...prev];
        for (const kw of newKeywords) {
          if (!combined.includes(kw)) combined.push(kw);
        }
        return combined;
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleSave = () => {
    const config: TeamConfig = {
      platforms,
      keywords,
      cronSchedule,
      updatedAt: new Date().toISOString(),
    };
    saveConfig(teamId, config);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={600}>
          团队配置 - {teamName}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* 发布平台多选 */}
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
            发布平台
          </FormLabel>
          <FormGroup row>
            {PLATFORM_OPTIONS.map((opt) => (
              <FormControlLabel
                key={opt.value}
                control={
                  <Checkbox
                    checked={platforms.includes(opt.value)}
                    onChange={() => handleTogglePlatform(opt.value)}
                    size="small"
                  />
                }
                label={opt.label}
              />
            ))}
          </FormGroup>
        </FormControl>

        {/* 关键词配置 */}
        <Box sx={{ mb: 3 }}>
          <FormLabel sx={{ mb: 1, display: 'block', fontWeight: 600, color: 'text.primary' }}>
            关键词配置
          </FormLabel>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="输入关键词，多个用逗号分隔"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
            />
            <Button variant="outlined" size="small" onClick={handleAddKeyword}>
              添加
            </Button>
          </Box>
          {keywords.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {keywords.map((kw) => (
                <Chip
                  key={kw}
                  label={kw}
                  size="small"
                  onDelete={() => handleRemoveKeyword(kw)}
                  sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* 定时任务 */}
        <Box sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, display: 'block', fontWeight: 600, color: 'text.primary' }}>
            定时任务
          </FormLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {CRON_OPTIONS.map((opt) => (
              <Paper
                key={opt.value}
                elevation={0}
                onClick={() => setCronSchedule(opt.value)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: cronSchedule === opt.value ? '#6366f1' : 'divider',
                  borderRadius: 1,
                  backgroundColor:
                    cronSchedule === opt.value
                      ? 'rgba(99,102,241,0.08)'
                      : 'transparent',
                  '&:hover': {
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.04)',
                  },
                }}
              >
                <Typography variant="body2">{opt.label}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
        >
          保存配置
        </Button>
      </DialogActions>
    </Dialog>
  );
}
