import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  /** 销售分析按钮回调，传入后替代导航行为 */
  onSalesAnalysis?: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  /** 渐变颜色方案 */
  gradient: string;
  action: () => void;
  /** 是否为 AI 推荐操作 */
  aiRecommended?: boolean;
}

const CARD_SIZE = 100;

export default function QuickActions({ onSalesAnalysis }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'add-product',
      title: '添加产品',
      icon: <AddIcon />,
      color: '#FF3B30',
      bgColor: 'rgba(255, 59, 48, 0.08)',
      gradient: 'linear-gradient(180deg, rgba(255,59,48,0.06) 0%, rgba(255,59,48,0.01) 100%)',
      action: () => navigate('/products'),
    },
    {
      id: 'search-inventory',
      title: '查询库存',
      icon: <SearchIcon />,
      color: '#6366F1',
      bgColor: 'rgba(99, 102, 241, 0.08)',
      gradient: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.01) 100%)',
      action: () => navigate('/inventory'),
      aiRecommended: true,
    },
    {
      id: 'sales-analysis',
      title: '销售分析',
      icon: <AnalyticsIcon />,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.08)',
      gradient: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.01) 100%)',
      action: () => {
        if (onSalesAnalysis) onSalesAnalysis();
        else navigate('/datacenter');
      },
    },
    {
      id: 'stock-alert',
      title: '库存预警',
      icon: <WarningIcon />,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.08)',
      gradient: 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.01) 100%)',
      action: () => navigate('/inventory'),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <TrendingUpIcon sx={{ color: '#FF3B30', mr: 0.5, fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1A1A2E' }}>
          快捷操作
        </Typography>
        <Chip
          label="AI 推荐"
          size="small"
          sx={{
            ml: 'auto',
            bgcolor: 'rgba(255,59,48,0.1)',
            color: '#FF3B30',
            border: '1px solid rgba(255,59,48,0.3)',
            height: 20,
            fontSize: 11,
            fontWeight: 600,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#ddd', borderRadius: 2 },
        }}
      >
        {actions.map(action => (
          <Box key={action.id} sx={{ flexShrink: 0, position: 'relative' }}>
            <Card
              elevation={0}
              sx={{
                width: CARD_SIZE,
                height: CARD_SIZE,
                border: '1px solid',
                borderColor: action.aiRecommended ? 'rgba(99,102,241,0.3)' : 'divider',
                borderRadius: 2,
                background: action.gradient,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                  borderColor: action.color,
                  transform: 'translateY(-3px) scale(1.03)',
                },
                // AI 推荐呼吸光晕
                ...(action.aiRecommended ? {
                  animation: 'aiPulse 2.5s ease-in-out infinite',
                  '@keyframes aiPulse': {
                    '0%, 100%': {
                      boxShadow: '0 0 0 0 rgba(99,102,241,0.15)',
                    },
                    '50%': {
                      boxShadow: '0 0 0 6px rgba(99,102,241,0)',
                    },
                  },
                } : {}),
              }}
            >
              <CardActionArea
                onClick={action.action}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: action.bgColor,
                    color: action.color,
                  }}
                >
                  {action.icon}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2, color: '#4B5563' }}>
                  {action.title}
                </Typography>
              </CardActionArea>
            </Card>
            {/* AI 推荐角标 */}
            {action.aiRecommended && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF3B30 0%, #6366F1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                }}
              >
                AI
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
