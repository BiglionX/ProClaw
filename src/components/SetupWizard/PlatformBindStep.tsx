import { useState } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';

interface PlatformBindStepProps {
  onPlatformsConfirmed: (platforms: string[]) => void;
}

const PLATFORMS = [
  { value: 'douyin', label: '抖音', icon: '🎵' },
  { value: 'meituan', label: '美团', icon: '🏷️' },
  { value: 'weapp', label: '小程序', icon: '📱' },
];

export function PlatformBindStep({ onPlatformsConfirmed }: PlatformBindStepProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const togglePlatform = (value: string) => {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(p => p !== value)
        : [...prev, value]
    );
  };

  const handleConfirm = () => {
    onPlatformsConfirmed(selected);
  };

  const handleSkip = () => {
    onPlatformsConfirmed([]);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        maxWidth: 500,
        mx: 'auto',
        py: 2,
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, textAlign: 'center' }}
      >
        选择您已有的平台账号（可多选）
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PLATFORMS.map(platform => (
          <Chip
            key={platform.value}
            label={`${platform.icon} ${platform.label}`}
            onClick={() => togglePlatform(platform.value)}
            variant={selected.includes(platform.value) ? 'filled' : 'outlined'}
            color={selected.includes(platform.value) ? 'error' : 'default'}
            sx={{
              px: 2,
              py: 2.5,
              fontSize: '0.95rem',
              color: selected.includes(platform.value) ? '#fff' : 'rgba(255,255,255,0.7)',
              borderColor: selected.includes(platform.value)
                ? '#ff3b30'
                : 'rgba(255,255,255,0.3)',
              bgcolor: selected.includes(platform.value)
                ? '#ff3b30'
                : 'transparent',
              '&:hover': {
                bgcolor: selected.includes(platform.value)
                  ? '#d32f2f'
                  : 'rgba(255,255,255,0.1)',
              },
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button variant="outlined" onClick={handleSkip} sx={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}>
          跳过
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={selected.length === 0}
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#d32f2f' },
            '&:disabled': { bgcolor: 'rgba(255,59,48,0.3)' },
          }}
        >
          确认绑定
        </Button>
      </Box>
    </Box>
  );
}
