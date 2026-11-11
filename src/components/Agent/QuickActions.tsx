import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  FileUpload as FileUploadIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  /** 销售分析按钮回调，传入后替代导航行为 */
  onSalesAnalysis?: () => void;
  /** 商品和客户都还没有时，把基础数据导入放在第一位 */
  importFirst?: boolean;
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

export default function QuickActions({ onSalesAnalysis, importFirst = false }: QuickActionsProps) {
  const navigate = useNavigate();

  const importAction: QuickAction = {
    id: 'master-import',
    title: '基础数据导入',
    icon: <FileUploadIcon />,
    color: '#0EA5E9',
    action: () => navigate('/import-center?entry=master'),
  };

  const dailyActions: QuickAction[] = [
    {
      id: 'add-product',
      title: '添加产品',
      icon: <AddIcon />,
      color: '#FF3B30',
      action: () => navigate('/products'),
    },
    {
      id: 'search-inventory',
      title: '查询库存',
      icon: <SearchIcon />,
      color: '#6366F1',
      action: () => navigate('/inventory'),
    },
    {
      id: 'sales-analysis',
      title: '销售分析',
      icon: <AnalyticsIcon />,
      color: '#10B981',
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
      action: () => navigate('/inventory'),
    },
  ];

  const actions = importFirst ? [importAction, ...dailyActions] : [...dailyActions, importAction];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <TrendingUpIcon sx={{ color: '#FF3B30', mr: 0.5, fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1A1A2E' }}>
          快捷操作
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {actions.map(action => (
          <Tooltip key={action.id} title={action.title} arrow>
            <IconButton
              onClick={action.action}
              aria-label={action.title}
              sx={{
                color: action.color,
                '&:hover': { bgcolor: `${action.color}14` },
              }}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
