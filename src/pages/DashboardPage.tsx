import {
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Box, Card, CardContent, Grid, Paper, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  change?: string;
}

function StatCard({ title, value, icon, color, change }: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: `${color}20`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {change && (
            <Typography
              variant="body2"
              color={change.startsWith('+') ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600 }}
            >
              {change}
            </Typography>
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📊 仪表盘
        </Typography>
        <Typography variant="body1" color="text.secondary">
          业务概览和关键指标
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="产品总数"
            value="1,234"
            icon={<InventoryIcon sx={{ color: '#1976d2', fontSize: 28 }} />}
            color="#1976d2"
            change="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="本月销售"
            value="¥45.6K"
            icon={<TrendingUpIcon sx={{ color: '#2e7d32', fontSize: 28 }} />}
            color="#2e7d32"
            change="+8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="库存交易"
            value="856"
            icon={<ShoppingCartIcon sx={{ color: '#ed6c02', fontSize: 28 }} />}
            color="#ed6c02"
            change="+15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="低库存预警"
            value="23"
            icon={<WarningIcon sx={{ color: '#d32f2f', fontSize: 28 }} />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          🚧 仪表盘功能开发中...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          正在集成产品库和进销存模块的数据可视化
        </Typography>
      </Paper>
    </Box>
  );
}
