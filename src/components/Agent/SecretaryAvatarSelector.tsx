import {
  Close,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { AVATAR_PRESETS, DEFAULT_AVATAR_KEY } from '../../types/secretary';

interface SecretaryAvatarSelectorProps {
  open: boolean;
  currentKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export default function SecretaryAvatarSelector({
  open,
  currentKey,
  onSelect,
  onClose,
}: SecretaryAvatarSelectorProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        🖼 更换头像
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            pt: 1,
          }}
        >
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = currentKey === preset.key;
            return (
              <Box
                key={preset.key}
                onClick={() => {
                  onSelect(preset.key);
                  onClose();
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #1976d2' : '2px solid transparent',
                  bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {isSelected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: '#1976d2',
                      color: 'white',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </Box>
                )}
                <Avatar
                  src={preset.src}
                  sx={{
                    width: 64,
                    height: 64,
                    fontSize: '1.5rem',
                    outline: isSelected ? '3px solid #1976d2' : 'none',
                    outlineOffset: -3,
                  }}
                >
                  {preset.key === DEFAULT_AVATAR_KEY ? '👩' : 
                   preset.key === 'avatar_01' ? '👩‍💼' :
                   preset.key === 'avatar_02' ? '👩‍💻' :
                   preset.key === 'avatar_03' ? '👩‍🦰' :
                   preset.key === 'avatar_04' ? '👩‍🎓' :
                   preset.key === 'avatar_05' ? '👩‍🦱' :
                   '🦉'}
                </Avatar>
                <Typography variant="caption" fontWeight={isSelected ? 600 : 400}>
                  {preset.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', textAlign: 'center' }}>
                  {preset.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'text.disabled' }}
        >
          未来版本将支持上传自定义头像
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
