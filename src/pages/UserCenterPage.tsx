import {
  AccountCircle as AccountCircleIcon,
  Api as ApiIcon,
  AttachMoney as MoneyIcon,
  BarChart as BarChartIcon,
  ExitToApp as LogoutIcon,
  Key as KeyIcon,
  Settings as SettingsIcon,
  ShowChart as ShowChartIcon,
  Webhook as WebhookIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAuthStore } from '../lib/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `user-tab-${index}`,
    'aria-controls': `user-tabpanel-${index}`,
  };
}

export default function UserCenterPage() {
  const [tabValue, setTabValue] = useState(0);
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 模拟统计数据（演示模式）
  const stats = {
    tokenBalance: 10000,
    totalApiCalls: 1234,
    activeKeys: 3,
    totalSpent: 156.80,
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          👤 用户中心
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理您的 API 密钥、Token 余额和账户设置
        </Typography>
      </Box>

      {/* 用户信息卡片 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountCircleIcon sx={{ fontSize: 60, color: 'primary.main', mr: 2 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {user?.email?.split('@')[0] || '用户'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  注册时间: {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Token 余额
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {stats.tokenBalance.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'success.light',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MoneyIcon sx={{ fontSize: 32, color: 'success.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总调用次数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {stats.totalApiCalls.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'primary.light',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShowChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    活跃密钥
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {stats.activeKeys}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'warning.light',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <KeyIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    累计消费
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    ¥{stats.totalSpent.toFixed(2)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'info.light',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChartIcon sx={{ fontSize: 32, color: 'info.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab 导航 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="🔑 API 密钥" {...a11yProps(0)} />
          <Tab label="💰 Token 管理" {...a11yProps(1)} />
          <Tab label="📊 使用统计" {...a11yProps(2)} />
          <Tab label="🔗 外部集成" {...a11yProps(3)} />
          <Tab label="⚙️ 账户设置" {...a11yProps(4)} />
        </Tabs>
      </Paper>

      {/* Tab 0: API 密钥管理 */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ApiIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                API 密钥管理
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                管理和配置您的 AI API 密钥（OpenAI、Anthropic、Azure 等）
              </Typography>
              <Button variant="contained" size="large">
                添加 API 密钥
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 1: Token 管理 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <MoneyIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Token 余额管理
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                查看 Token 余额、购买记录和充值
              </Typography>
              <Button variant="contained" size="large" sx={{ mr: 2 }}>
                充值 Token
              </Button>
              <Button variant="outlined" size="large">
                查看购买记录
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: 使用统计 */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BarChartIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                API 使用统计
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                查看 API 调用统计、模型使用分析和费用明细
              </Typography>
              <Button variant="contained" size="large">
                查看详细统计
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: 外部集成 */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <WebhookIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                外部集成管理
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                配置 Webhook、API 端点和 OAuth 集成
              </Typography>
              <Button variant="contained" size="large">
                添加集成
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 4: 账户设置 */}
      <TabPanel value={tabValue} index={4}>
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SettingsIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                账户设置
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                修改个人资料、密码和安全设置
              </Typography>
              <Button variant="contained" size="large">
                编辑个人资料
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
