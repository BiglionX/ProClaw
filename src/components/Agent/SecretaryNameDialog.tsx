import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

interface SecretaryNameDialogProps {
  open: boolean;
  currentName: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function SecretaryNameDialog({
  open,
  currentName,
  onConfirm,
  onClose,
}: SecretaryNameDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError('');
    }
  }, [open, currentName]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('名称至少 2 个字符');
      return;
    }
    if (trimmed.length > 10) {
      setError('名称不能超过 10 个字符');
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          ✏️ 修改名称
        </Typography>
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          error={!!error}
          helperText={error || '2-10 个字符，支持中文/英文/数字/emoji'}
          placeholder="输入秘书名称"
          inputProps={{ maxLength: 10 }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!name.trim()}>
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
}
