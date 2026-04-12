import {
  Add as AddIcon,
  SmartToy as AIIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  AIConfig,
  AIProvider,
  getAIConfig,
  saveAIConfig,
  testAIConnection,
} from '../../lib/aiConfig';

export default function AISettings() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getAIConfig();
      setConfig(data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '加载配置失败',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      await saveAIConfig(config);
      setSnackbar({
        open: true,
        message: '配置保存成功',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存配置失败',
        severity: 'error',
      });
    }
  };

  const handleTestConnection = async (provider: AIProvider) => {
    setTestingProvider(provider.id);
    try {
      const result = await testAIConnection(provider);
      setTestResults(prev => ({ ...prev, [provider.id]: result }));
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '测试失败',
        severity: 'error',
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSetDefault = (providerId: string) => {
    if (!config) return;
    setConfig({
      ...config,
      defaultProvider: providerId,
      providers: config.providers.map(p => ({
        ...p,
        isActive: p.id === providerId,
      })),
    });
  };

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider({ ...provider });
    setDialogOpen(true);
  };

  const handleAddProvider = () => {
    setEditingProvider({
      id: `custom-${Date.now()}`,
      name: '',
      type: 'custom',
      endpoint: '',
      apiKey: '',
      model: '',
      isActive: false,
    });
    setDialogOpen(true);
  };

  const handleSaveProvider = () => {
    if (!config || !editingProvider) return;

    if (
      !editingProvider.name ||
      !editingProvider.endpoint ||
      !editingProvider.model
    ) {
      setSnackbar({
        open: true,
        message: '请填写必填字段',
        severity: 'error',
      });
      return;
    }

    const updatedProviders = config.providers.map(p =>
      p.id === editingProvider.id ? editingProvider : p
    );

    if (!updatedProviders.find(p => p.id === editingProvider.id)) {
      updatedProviders.push(editingProvider);
    }

    setConfig({
      ...config,
      providers: updatedProviders,
    });
    setDialogOpen(false);
    setEditingProvider(null);
  };

  const handleDeleteProvider = (providerId: string) => {
    if (!config) return;
    if (providerId === 'default-service') {
      setSnackbar({
        open: true,
        message: '无法删除默认提供商',
        severity: 'error',
      });
      return;
    }

    setConfig({
      ...config,
      providers: config.providers.filter(p => p.id !== providerId),
      defaultProvider:
        config.defaultProvider === providerId
          ? 'default-service'
          : config.defaultProvider,
    });
  };

  const getProviderLogo = (type: string, size: number = 32) => {
    // ProClaw 使用本地图片，其他使用彩色圆形标识
    if (type === 'default') {
      return (
        <Box
          component="img"
          src="/proclaw-logo.png"
          alt="ProClaw"
          sx={{ width: size, height: size, objectFit: 'contain' }}
        />
      );
    }

    // 其他提供商使用彩色圆形 + 文字标识
    const providerLabels: Record<
      string,
      { text: string; color: string; bg: string }
    > = {
      openai: { text: 'O', color: '#10a37f', bg: '#e8f5e9' },
      azure: { text: 'A', color: '#0078d4', bg: '#e3f2fd' },
      aliyun: { text: 'A', color: '#ff6a00', bg: '#fff3e0' },
      zhipu: { text: 'Z', color: '#7c3aed', bg: '#f3e8ff' },
      custom: { text: 'C', color: '#666', bg: '#f5f5f5' },
    };

    const config = providerLabels[type] || providerLabels.custom;
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: config.bg,
          color: config.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
          fontWeight: 'bold',
        }}
      >
        {config.text}
      </Box>
    );
  };

  if (loading) {
    return <Typography>加载中...</Typography>;
  }

  if (!config) {
    return <Typography>配置加载失败</Typography>;
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          🤖 AI 模型设置
        </Typography>
        <Typography variant="body1" color="text.secondary">
          配置大语言模型 API，为 AI 智能体提供动力
        </Typography>
      </Box>

      {/* 当前默认提供商 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            当前 AI 提供商
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {(() => {
            const currentProvider = config.providers.find(
              p => p.id === config.defaultProvider
            );
            if (!currentProvider) return null;
            return (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'primary.50',
                  border: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {getProviderLogo(currentProvider.type, 48)}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      {currentProvider.name}
                      <Chip
                        label="默认"
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      模型: {currentProvider.model} | 温度: {config.temperature}
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      currentProvider.type === 'default'
                        ? '内置服务'
                        : currentProvider.apiKey
                          ? '已配置'
                          : '未配置'
                    }
                    color={
                      currentProvider.type === 'default'
                        ? 'success'
                        : currentProvider.apiKey
                          ? 'success'
                          : 'warning'
                    }
                    size="small"
                  />
                </Box>
              </Paper>
            );
          })()}
        </CardContent>
      </Card>

      {/* 默认 AI 服务提示 */}
      <Alert severity="warning" sx={{ mb: 3 }} icon={<AIIcon />}>
        <Typography variant="body2">
          <strong>⚠️ 服务暂时不可用</strong> - ProClaw 集成 LLM
          服务当前无法连接，请自行配置大模型 API（如
          OpenAI、阿里云、智谱等）以确保 AI 功能正常使用。
        </Typography>
      </Alert>

      {/* 模型参数设置 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            模型参数
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Temperature（创造性）: {config.temperature}
              </Typography>
              <Slider
                value={config.temperature}
                onChange={(_, value) =>
                  setConfig({ ...config, temperature: value as number })
                }
                step={0.1}
                marks
                min={0}
                max={1}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                较低值使输出更确定，较高值使输出更创造性
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Max Tokens（最大输出长度）"
                type="number"
                value={config.maxTokens}
                onChange={e =>
                  setConfig({
                    ...config,
                    maxTokens: parseInt(e.target.value) || 2000,
                  })
                }
                inputProps={{ min: 100, max: 8000 }}
                fullWidth
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                单次对话的最大 Token 数量
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 提供商列表 */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">AI 提供商列表</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddProvider}
            >
              添加提供商
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>提供商</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>API 地址</TableCell>
                  <TableCell>模型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {config.providers.map(provider => (
                  <TableRow
                    key={provider.id}
                    selected={provider.id === config.defaultProvider}
                  >
                    <TableCell>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {getProviderLogo(provider.type, 24)}
                        <Box>
                          <Typography variant="subtitle2">
                            {provider.name}
                          </Typography>
                          {provider.id === config.defaultProvider && (
                            <Chip
                              label="默认"
                              size="small"
                              color="primary"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          provider.type === 'default' ? '内置' : provider.type
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {provider.endpoint}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{provider.model}</Typography>
                    </TableCell>
                    <TableCell>
                      {testResults[provider.id] ? (
                        <Chip
                          label={
                            testResults[provider.id].success
                              ? '连接成功'
                              : '连接失败'
                          }
                          color={
                            testResults[provider.id].success
                              ? 'success'
                              : 'error'
                          }
                          size="small"
                          icon={
                            testResults[provider.id].success ? (
                              <CheckIcon />
                            ) : undefined
                          }
                        />
                      ) : provider.type === 'default' ? (
                        <Chip label="内置服务" color="success" size="small" />
                      ) : provider.apiKey ? (
                        <Chip label="已配置" color="success" size="small" />
                      ) : (
                        <Chip label="未配置" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          justifyContent: 'flex-end',
                        }}
                      >
                        {provider.id !== config.defaultProvider && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleSetDefault(provider.id)}
                            sx={{
                              fontSize: '0.75rem',
                              minWidth: 'unset',
                              padding: '4px 8px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            设为默认
                          </Button>
                        )}
                        {provider.type !== 'default' && (
                          <IconButton
                            size="small"
                            onClick={() => handleTestConnection(provider)}
                            disabled={testingProvider === provider.id}
                          >
                            <RefreshIcon
                              sx={{
                                fontSize: 18,
                                animation:
                                  testingProvider === provider.id
                                    ? 'spin 1s linear infinite'
                                    : 'none',
                                '@keyframes spin': {
                                  '0%': { transform: 'rotate(0deg)' },
                                  '100%': { transform: 'rotate(360deg)' },
                                },
                              }}
                            />
                          </IconButton>
                        )}
                        {provider.type !== 'default' && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditProvider(provider)}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                        {provider.type !== 'default' && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteProvider(provider.id)}
                            color="error"
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={loadConfig}>
          重置
        </Button>
        <Button variant="contained" onClick={handleSave}>
          保存配置
        </Button>
      </Box>

      {/* 编辑/添加提供商对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disablePortal={false}
        sx={{
          zIndex: 9999,
          '& .MuiDialog-container': {
            '& .MuiPaper-root': {
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle>
          {editingProvider?.id.startsWith('custom-') ? '添加' : '编辑'} AI
          提供商
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>提供商类型</InputLabel>
              <Select
                value={editingProvider?.type || 'custom'}
                label="提供商类型"
                onChange={e =>
                  setEditingProvider(prev =>
                    prev
                      ? {
                          ...prev,
                          type: e.target.value as AIProvider['type'],
                        }
                      : null
                  )
                }
              >
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="azure">Azure OpenAI</MenuItem>
                <MenuItem value="aliyun">阿里云通义千问</MenuItem>
                <MenuItem value="zhipu">智谱清言</MenuItem>
                <MenuItem value="custom">自定义</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="提供商名称 *"
              value={editingProvider?.name || ''}
              onChange={e =>
                setEditingProvider(prev =>
                  prev ? { ...prev, name: e.target.value } : null
                )
              }
              fullWidth
              required
            />

            <TextField
              label="API 地址 *"
              value={editingProvider?.endpoint || ''}
              onChange={e =>
                setEditingProvider(prev =>
                  prev ? { ...prev, endpoint: e.target.value } : null
                )
              }
              placeholder="https://api.example.com/v1"
              fullWidth
              required
            />

            <TextField
              label="API Key"
              value={editingProvider?.apiKey || ''}
              onChange={e =>
                setEditingProvider(prev =>
                  prev ? { ...prev, apiKey: e.target.value } : null
                )
              }
              type="password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">sk-</InputAdornment>
                ),
              }}
              fullWidth
            />

            <TextField
              label="模型名称 *"
              value={editingProvider?.model || ''}
              onChange={e =>
                setEditingProvider(prev =>
                  prev ? { ...prev, model: e.target.value } : null
                )
              }
              placeholder="gpt-4"
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveProvider} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
