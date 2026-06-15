import {
  Info as InfoIcon,
  Analytics as AnalyticsIcon,
  Help as HelpIcon,
  Science as ScienceIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAppModeStore } from '../config/appMode';
import { isDemoAccountContext, readDemoFlag, recordDemoReset } from '../lib/demoFlag';
import AISettings from '../components/Settings/AISettings';
import DatabaseSettings from '../components/Settings/DatabaseSettings';

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
  const mode = useAppModeStore(state => state.mode);
  const [tabValue, setTabValue] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    products: number;
    cloudStore: boolean;
    teams: string[];
    plugins: string[];
    hasError?: boolean;
    errorMessage?: string;
  } | null>(null);
  const navigate = useNavigate();

  const isDemo = isDemoAccountContext();
  const demoFlag = isDemo ? readDemoFlag() : null;

  // 监听演示数据引导完成事件，自动刷新本地标记
  useEffect(() => {
    if (!isDemo) return;
    const handler = () => {
      // 强制刷新组件（读取最新的 flag）
      setTabValue(v => v);
    };
    window.addEventListener('proclaw:demo-bootstrapped', handler);
    return () => window.removeEventListener('proclaw:demo-bootstrapped', handler);
  }, [isDemo]);

  const handleResetDemoData = useCallback(async () => {
    setResetConfirmOpen(false);
    setResetting(true);
    setResetResult(null);
    try {
      const { resetDemoData } = await import('../lib/demoBootstrap');
      const result = await resetDemoData();
      setResetResult(result);
      recordDemoReset();
      // 通知其他组件
      window.dispatchEvent(new CustomEvent('proclaw:demo-bootstrapped', { detail: { reset: true } }));
    } catch (e) {
      setResetResult({
        products: 0,
        cloudStore: false,
        teams: [],
        plugins: [],
        hasError: true,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setResetting(false);
    }
  }, []);

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
          {mode !== 'light' && <Tab label="🗄️ 数据库设置" {...a11yProps(1)} />}
          {mode !== 'light' && <Tab label="🔍 指令分析" {...a11yProps(2)} />}
          <Tab label="ℹ️ 系统信息" {...a11yProps(3)} />
          {mode !== 'light' && <Tab label="📧 邀请管理" {...a11yProps(4)} />}
          {isDemo && <Tab label="🧪 数据管理" {...a11yProps(5)} />}
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

      {/* Tab 5: 数据管理（仅演示账号） */}
      {isDemo && (
        <TabPanel value={tabValue} index={5}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <ScienceIcon sx={{ color: '#FF3B30' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  演示数据管理
                </Typography>
                <Chip
                  label="仅演示账号可见"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 59, 48, 0.1)',
                    color: '#FF3B30',
                    borderColor: '#FF3B30',
                    fontSize: '0.7rem',
                  }}
                  variant="outlined"
                />
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                当前为 <strong>演示账号</strong>，系统已自动注入测试数据包用于功能演示。
                您可以查看当前预置内容，或将数据重置回出厂演示状态。
              </Typography>

              {/* 预置内容清单 */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#FAFAFA' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  📦 当前预置内容
                </Typography>
                <List dense sx={{ py: 0 }}>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 32 }}>📱</ListItemIcon>
                    <ListItemText
                      primary={`${demoFlag?.productsCount ?? 20} 个 iPhone 电池 SPU 产品`}
                      secondary="商品库可查看"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 32 }}>🏪</ListItemIcon>
                    <ListItemText
                      primary={`已开通云商城（${demoFlag?.cloudStoreSubdomain ?? 'demo'}.proclaw.cc）`}
                      secondary="云商城 8 个管理 Tab + 预览"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 32 }}>🤖</ListItemIcon>
                    <ListItemText
                      primary={`${demoFlag?.teamNames.length ?? 3} 个 AI 团队`}
                      secondary={(demoFlag?.teamNames ?? [
                        'AI 经营团队',
                        '国内社媒运营团队',
                        '海外社媒运营团队',
                      ]).join('、')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 32 }}>🧩</ListItemIcon>
                    <ListItemText
                      primary={`${demoFlag?.pluginIds.length ?? 1} 个行业插件`}
                      secondary="外贸柜台运营助手"
                    />
                  </ListItem>
                </List>
                {demoFlag && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    初始化时间：{new Date(demoFlag.initializedAt).toLocaleString('zh-CN')}
                    {demoFlag.lastResetAt && (
                      <> · 最近重置：{new Date(demoFlag.lastResetAt).toLocaleString('zh-CN')}（{demoFlag.resetCount ?? 0} 次）</>
                    )}
                  </Typography>
                )}
              </Paper>

              {/* 重置按钮 */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚙️ 重置演示数据
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  将清空当前所有业务数据（产品/云商城/团队）并重新注入预置的 20 个产品 + 1 个云商城 + 3 个 AI 团队。
                  <br />
                  <strong style={{ color: '#EF4444' }}>此操作不可恢复，请谨慎使用。</strong>
                </Typography>

                <Button
                  variant="contained"
                  color="warning"
                  startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={resetting}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {resetting ? '正在重置…' : '重置为演示数据'}
                </Button>

                {resetResult && (
                  <Alert
                    severity={resetResult.hasError ? 'error' : 'success'}
                    icon={resetResult.hasError ? <WarningIcon /> : undefined}
                    sx={{ mt: 2 }}
                  >
                    {resetResult.hasError
                      ? `重置失败：${resetResult.errorMessage}`
                      : (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            重置成功！已重新注入演示数据。
                          </Typography>
                          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                            • 产品：{resetResult.products} 个
                            <br />
                            • 云商城：{resetResult.cloudStore ? '已开通' : '失败'}
                            <br />
                            • AI 团队：{resetResult.teams.length} 个
                            <br />
                            • 插件：{resetResult.plugins.length} 个
                          </Typography>
                        </>
                      )}
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 重置确认对话框 */}
          <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon sx={{ color: '#EF4444' }} />
              确认重置演示数据？
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                此操作将：
                <Box component="ul" sx={{ mt: 1, mb: 1, pl: 3 }}>
                  <li>清空当前所有业务数据</li>
                  <li>重新注入 20 个产品 SPU</li>
                  <li>重新开通演示云商城</li>
                  <li>重新下载 3 个 AI 团队（从 Nvwax）</li>
                </Box>
                <strong style={{ color: '#EF4444' }}>重置操作不可恢复，是否继续？</strong>
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setResetConfirmOpen(false)}>取消</Button>
              <Button
                onClick={handleResetDemoData}
                color="warning"
                variant="contained"
                autoFocus
              >
                确认重置
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>
      )}
    </Box>
  );
}
