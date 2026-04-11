import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  Chip,
  Grid,
  Paper,
  Typography,
} from '@mui/material';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

export default function QuickActions() {
  const actions: QuickAction[] = [
    {
      id: 'add-product',
      title: '添加产品',
      description: '快速录入新产品',
      icon: <AddIcon />,
      color: '#1976d2',
      action: () => console.log('添加产品'),
    },
    {
      id: 'search-inventory',
      title: '查询库存',
      description: '查看当前库存状态',
      icon: <SearchIcon />,
      color: '#2e7d32',
      action: () => console.log('查询库存'),
    },
    {
      id: 'sales-analysis',
      title: '销售分析',
      description: '分析销售数据和趋势',
      icon: <AnalyticsIcon />,
      color: '#ed6c02',
      action: () => console.log('销售分析'),
    },
    {
      id: 'stock-alert',
      title: '库存预警',
      description: '查看低库存警告',
      icon: <WarningIcon />,
      color: '#d32f2f',
      action: () => console.log('库存预警'),
    },
    {
      id: 'create-order',
      title: '创建订单',
      description: '新建采购或销售订单',
      icon: <ShoppingCartIcon />,
      color: '#9c27b0',
      action: () => console.log('创建订单'),
    },
    {
      id: 'reports',
      title: '生成报表',
      description: '查看业务报表',
      icon: <AssessmentIcon />,
      color: '#0097a7',
      action: () => console.log('生成报表'),
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TrendingUpIcon sx={{ color: '#1976d2', mr: 1 }} />
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
          快捷操作
        </Typography>
        <Chip
          label="智能推荐"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ ml: 'auto' }}
        />
      </Box>

      <Grid container spacing={2}>
        {actions.map(action => (
          <Grid item xs={12} sm={6} md={4} key={action.id}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 2,
                  borderColor: action.color,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardActionArea onClick={action.action} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: action.color,
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                    }}
                  >
                    {action.icon}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
