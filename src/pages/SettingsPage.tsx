import { Info as InfoIcon } from '@mui/icons-material';
import {
  Box,
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
  const [tabValue, setTabValue] = useState(0);

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
          <Tab label="ℹ️ 系统信息" {...a11yProps(2)} />
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

      {/* Tab 2: 系统信息 */}
      <TabPanel value={tabValue} index={2}>
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
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
