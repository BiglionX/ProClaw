import { Typography, Box, IconButton } from '@mui/material';
import { Storefront as StorefrontIcon, Close as CloseIcon } from '@mui/icons-material';

interface RecruitButtonProps {
  onClick: () => void;
  onClose?: () => void;
}

export default function RecruitButton({ onClick, onClose }: RecruitButtonProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 88, // 56px(FAB) + 8px(gap)
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.5,
        py: 0.6,
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.06)',
        color: '#666',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: 'rgba(0,0,0,0.1)',
          color: '#333',
        },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <StorefrontIcon sx={{ fontSize: 16, opacity: 0.7 }} />
        <Typography variant="caption" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          Agent 市场
        </Typography>
      </Box>
      {onClose && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          sx={{
            ml: 0.5,
            width: 18,
            height: 18,
            color: 'rgba(0,0,0,0.3)',
            '&:hover': {
              color: 'rgba(0,0,0,0.7)',
              bgcolor: 'rgba(0,0,0,0.08)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      )}
    </Box>
  );
}
