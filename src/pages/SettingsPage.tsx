import { Info as InfoIcon, Analytics as AnalyticsIcon, Help as HelpIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import AISettings from '../components/Settings/AISettings';
import DatabaseSettings from '../components/Settings/DatabaseSettings';
import PreferenceSettings from '../components/CEO/PreferenceSettings';
import CompanyConfigManager from '../components/CEO/CompanyConfigManager';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  const handleReconfigureClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleReconfigureConfirm = useCallback(async () => {
    setConfirmOpen(false);
    // 打开安装向导（Tauri 环境）或导航到 setup 页面
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const setupWindow = new WebviewWindow('setup-wizard', {
        url: '/#/setup',
        width: 720,
        height: 620,
        decorations: false,
        center: true,
        resizable: false,
      });
      setupWindow.once('tauri://created', () => {
        console.log('Setup wizard window created');
      });
      setupWindow.once('tauri://error', (e) => {
        console.error('Failed to create setup wizard window', e);
      });
    } catch {
      // 非 Tauri 环境，直接导航
      window.location.hash = '#/setup';
    }
  }, []);

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          ⚙️ 系统设置
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI 模型、数据库、同步和系统信息
        </Typography>
      </Box>

      {/* Tab 导航 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="🤖 AI 模型设置" {...a11yProps(0)} />
          <Tab label="🗄️ 数据库设置" {...a11yProps(1)} />
          <Tab label="🔍 指令分析" {...a11yProps(2)} />
          <Tab label="ℹ️ 系统信息" {...a11yProps(3)} />
          <Tab label="📧 邀请管理" {...a11yProps(4)} />
          <Tab label="🧠 CEO Agent" {...a11yProps(5)} />
        </Tabs>
      </Paper>

      {/* Tab 0: AI 模型设置 */}
      <TabPanel value={tabValue} index={0}>
        <AISettings />
      </TabPanel>

      {/* Tab 1: 数据库设置 */}
      <TabPanel value={tabValue} index={1}>
        <DatabaseSettings />
      </TabPanel>

      {/* Tab 2: 指令分析 */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AnalyticsIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">未识别指令分析</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" paragraph>
              查看和分析用户输入但 AI Chat 无法识别的自然语言指令，帮助优化命令解析器。
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                💡 <strong>使用说明：</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>系统会自动收集所有未识别的用户指令</li>
                  <li>可以查看高频指令，优先优化这些场景</li>
                  <li>支持导出为 JSON 或 CSV 格式进行分析</li>
                  <li>定期清理旧数据，保持系统性能</li>
                </ul>
              </Typography>
              <Button
                variant="contained"
                startIcon={<AnalyticsIcon />}
                onClick={() => navigate('/unrecognized-commands')}
                sx={{ mt: 2, mr: 2 }}
              >
                查看详细分析
              </Button>
            </Box>
          </CardContent>
        </Card>
        
        {/* FAQ 管理 */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HelpIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">FAQ 常见问题管理</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" paragraph>
              自动从用户对话中收集高频问题，经审核后同步到营销网站FAQ页面。
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                🎯 <strong>功能特点：</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>自动记录用户查询并检测高频问题</li>
                  <li>智能分类和生成FAQ草稿</li>
                  <li>人工审核确保质量</li>
                  <li>一键导出同步到营销网站</li>
                  <li>统计分析和用户反馈追踪</li>
                </ul>
              </Typography>
              <Button
                variant="contained"
                startIcon={<HelpIcon />}
                onClick={() => navigate('/faq-management')}
                sx={{ mt: 2 }}
              >
                管理FAQ
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: 系统信息 */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <InfoIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">系统信息</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    应用版本
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    v0.1.0
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    数据库引擎
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    SQLite + SQLCipher
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                  <Typography variant="body2" color="text.secondary">
                    云端服务
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Supabase（可选）
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    框架版本
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Tauri 2.0
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            
            {/* 重新配置公司 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                重新运行安装向导
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                您可以重新运行 CEO Agent 安装向导来修改公司名称和模型配置。
                注意：修改公司名不会影响已有数据。
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleReconfigureClick}
              >
                重新配置公司
              </Button>
            </Box>

            {/* 重新配置确认对话框 */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
              <DialogTitle>确认重新配置？</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  重新运行安装向导不会影响您现有的业务数据。
                  公司名称和模型配置将被更新。
                  是否继续？
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmOpen(false)}>取消</Button>
                <Button onClick={handleReconfigureConfirm} color="warning" variant="contained">
                  确认重新配置
                </Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 5: CEO Agent 偏好设置 */}
      <TabPanel value={tabValue} index={5}>
        <PreferenceSettings />
        <Box sx={{ mt: 3 }}>
          <CompanyConfigManager />
        </Box>
      </TabPanel>
    </Box>
  );
}
