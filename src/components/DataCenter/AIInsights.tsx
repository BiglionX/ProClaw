import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Typography,
} from '@mui/material';

export interface AIInsightItem {
  type: 'good' | 'warning' | 'trend';
  message: string;
  action?: {
    label: string;
    path: string;
  };
}

interface AIInsightsProps {
  insights: AIInsightItem[];
}

const TYPE_CONFIG = {
  good: {
    label: '好消息',
    emoji: '🟢',
    bgGradient: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.01) 100%)',
    borderColor: 'rgba(16,185,129,0.12)',
    chipColor: '#10B981',
    chipBg: 'rgba(16,185,129,0.1)',
  },
  warning: {
    label: '需要注意',
    emoji: '🟡',
    bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.01) 100%)',
    borderColor: 'rgba(245,158,11,0.12)',
    chipColor: '#F59E0B',
    chipBg: 'rgba(245,158,11,0.1)',
  },
  trend: {
    label: '趋势发现',
    emoji: '🔵',
    bgGradient: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.01) 100%)',
    borderColor: 'rgba(99,102,241,0.12)',
    chipColor: '#6366F1',
    chipBg: 'rgba(99,102,241,0.1)',
  },
};

export default function AIInsights({ insights }: AIInsightsProps) {
  const navigate = useNavigate();

  if (insights.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 3,
        p: 2.5,
        borderRadius: 2,
        border: '1px solid rgba(99,102,241,0.1)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.03) 0%, rgba(255,59,48,0.02) 100%)',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: '0.95rem',
          mb: 2,
          color: '#1A1A2E',
        }}
      >
        🧠 AI 今日洞察
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {insights.map((insight, index) => {
          const config = TYPE_CONFIG[insight.type];
          return (
            <Box
              key={index}
              sx={{
                p: 2,
                borderRadius: 1.5,
                background: config.bgGradient,
                border: '1px solid',
                borderColor: config.borderColor,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {config.emoji}
                </Typography>
                <Chip
                  label={config.label}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: config.chipBg,
                    color: config.chipColor,
                  }}
                />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#4B5563',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                }}
              >
                {insight.message}
              </Typography>
              {insight.action && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => navigate(insight.action!.path)}
                  sx={{
                    mt: 1,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#FF3B30',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: 'rgba(255,59,48,0.06)' },
                  }}
                >
                  {insight.action.label} →
                </Button>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
