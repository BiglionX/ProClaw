import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';

interface CompanyNameInputProps {
  onNameConfirmed: (name: string) => void;
}

const MAX_NAME_LENGTH = 50;
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export function CompanyNameInput({ onNameConfirmed }: CompanyNameInputProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('公司名称不能为空');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`公司名称不能超过 ${MAX_NAME_LENGTH} 个字符`);
      return;
    }
    const filtered = trimmed.replace(ILLEGAL_CHARS, '');
    if (filtered !== trimmed) {
      setError('公司名称包含非法字符，已自动过滤');
      setName(filtered);
      return;
    }
    setError(null);
    setConfirmed(true);
    onNameConfirmed(filtered);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !confirmed) {
      handleConfirm();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="例如：云创科技"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(null); }}
        onKeyDown={handleKeyDown}
        disabled={confirmed}
        inputProps={{ maxLength: MAX_NAME_LENGTH }}
        sx={{
          input: { color: '#fff' },
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
          },
        }}
      />

      {error && (
        <Typography variant="caption" sx={{ color: '#ff5252' }}>
          {error}
        </Typography>
      )}

      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
        {name.length}/{MAX_NAME_LENGTH}
      </Typography>

      {!confirmed && (
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!name.trim()}
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#d32f2f' },
            '&:disabled': { bgcolor: 'rgba(255,59,48,0.3)' },
          }}
        >
          确认公司名
        </Button>
      )}
    </Box>
  );
}
