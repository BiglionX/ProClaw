import { Box, Button, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { CEOBubble } from './CEOBubble';

interface CompletionScreenProps {
  companyName: string;
  onEnterWorkspace: () => void;
}

export function CompletionScreen({ companyName, onEnterWorkspace }: CompletionScreenProps) {
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
        textAlign: 'center',
        py: 2,
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#4caf50' }} />

      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
        配置完成！
      </Typography>

      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
        公司「{companyName}」已准备就绪
      </Typography>

      <CEOBubble
        speaker="ceo"
        text="一切就绪！您可以在聊天窗口随时找到我。现在，让我们开始工作吧！"
        isTyping={true}
      />

      <Button
        variant="contained"
        size="large"
        onClick={onEnterWorkspace}
        sx={{
          mt: 2,
          bgcolor: '#ff3b30',
          '&:hover': { bgcolor: '#d32f2f' },
          px: 6,
          py: 1.5,
          fontSize: '1.1rem',
          borderRadius: 2,
        }}
      >
        进入工作区
      </Button>
    </Box>
  );
}
