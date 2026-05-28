import { Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface RecruitButtonProps {
  onClick: () => void;
}

export default function RecruitButton({ onClick }: RecruitButtonProps) {
  return (
    <Button
      variant="contained"
      onClick={onClick}
      startIcon={<AddIcon />}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1200,
        bgcolor: '#ff3b30',
        color: '#fff',
        px: 3,
        py: 1.5,
        borderRadius: 28,
        boxShadow: '0 4px 12px rgba(255, 59, 48, 0.4)',
        '&:hover': {
          bgcolor: '#d32f2f',
          boxShadow: '0 6px 16px rgba(255, 59, 48, 0.5)',
        },
        fontWeight: 600,
        gap: 1,
      }}
    >
      <AddIcon />
      <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
        发现更多 Agent
      </Typography>
    </Button>
  );
}
