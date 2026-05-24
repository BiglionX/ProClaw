import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Smartphone as SmartphoneIcon,
  Computer as ComputerIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile';
  access_token: string;
  token_expires_at: number;
  last_active_at?: number;
  is_revoked: boolean;
  created_at: string;
}

interface PairingInfo {
  pairing_code: string;
  qr_content: string;
  expires_at: number;
  local_ips: string[];
  port: number;
}

const DevicePairingPage: React.FC = () => {
  const [pairingInfo, setPairingInfo] = useState<PairingInfo | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [_refreshing, setRefreshing] = useState<boolean>(false);
  const [openRevokeDialog, setOpenRevokeDialog] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // 通知提示
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 加载配对信息
  const loadPairingInfo = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      // const response = await apiClient.get('/api/auth/pairing-code');
      
      // 模拟数据
      setPairingInfo({
        pairing_code: '123456',
        qr_content: 'proclaw://pair?host=192.168.1.100&port=8888&code=123456',
        expires_at: Date.now() / 1000 + 300, // 5分钟后过期
        local_ips: ['192.168.1.100', '10.0.0.5'],
        port: 8888,
      });

      showSnackbar('配对码已生成', 'success');
    } catch (error) {
      console.error('Failed to load pairing info:', error);
      showSnackbar('加载配对信息失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 加载已授权设备
  const loadDevices = async () => {
    setRefreshing(true);
    try {
      // 模拟API调用
      // const response = await apiClient.get('/api/devices');
      
      // 模拟数据
      setDevices([
        {
          id: '1',
          user_id: 'user1',
          device_name: '我的iPhone',
          device_type: 'mobile',
          access_token: 'token1',
          token_expires_at: Date.now() / 1000 + 86400,
          last_active_at: Date.now() / 1000 - 300,
          is_revoked: false,
          created_at: '2024-01-01 10:00:00',
        },
        {
          id: '2',
          user_id: 'user1',
          device_name: '办公室电脑',
          device_type: 'desktop',
          access_token: 'token2',
          token_expires_at: Date.now() / 1000 + 86400,
          last_active_at: Date.now() / 1000 - 60,
          is_revoked: false,
          created_at: '2024-01-02 14:30:00',
        },
      ]);
    } catch (error) {
      console.error('Failed to load devices:', error);
      showSnackbar('加载设备列表失败', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPairingInfo();
    loadDevices();
  }, []);

  // 刷新配对码
  const handleRefreshPairingCode = () => {
    loadPairingInfo();
  };

  // 复制配对链接
  const handleCopyLink = () => {
    if (pairingInfo) {
      navigator.clipboard.writeText(pairingInfo.qr_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showSnackbar('链接已复制', 'info');
    }
  };

  // 踢除设备
  const handleRevokeDevice = async () => {
    if (!selectedDevice) return;
    
    try {
      setLoading(true);
      // await apiClient.post(`/api/devices/${selectedDevice.id}/revoke`);
      
      showSnackbar(`已踢除设备: ${selectedDevice.device_name}`, 'success');
      setOpenRevokeDialog(false);
      loadDevices();
    } catch (error) {
      console.error('Failed to revoke device:', error);
      showSnackbar('踢除设备失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示通知
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // 检查是否在线
  const isDeviceOnline = (device: Device): boolean => {
    if (!device.last_active_at) return false;
    const lastActive = device.last_active_at * 1000; // 转换为毫秒
    return (Date.now() - lastActive) < 5 * 60 * 1000; // 5分钟内活跃认为在线
  };

  // 格式化时间
  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  // 计算剩余时间
  const getRemainingTime = (): string => {
    if (!pairingInfo) return '';
    const remaining = Math.max(0, pairingInfo.expires_at - Date.now() / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartphoneIcon fontSize="large" />
          设备配对
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshPairingCode}
          disabled={loading}
        >
          刷新配对码
        </Button>
      </Box>

      {/* 配对信息展示 */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        {/* 左侧 - 二维码和配对码 */}
        <Box sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 2, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
            扫描二维码配对
          </Typography>
          
          {/* 模拟二维码 */}
          <Box
            sx={{
              width: 200,
              height: 200,
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              mb: 2,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <QrCodeIcon sx={{ fontSize: 180, color: '#000' }} />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 40,
                height: 40,
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ComputerIcon sx={{ fontSize: 30, color: '#6366f1' }} />
            </Box>
          </Box>

          {/* 配对码 */}
          <Typography variant="h4" sx={{ color: '#fff', fontFamily: 'monospace', letterSpacing: 2, mb: 1 }}>
            {pairingInfo?.pairing_code || '------'}
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#aaa', mb: 2 }}>
            配对码每5分钟自动刷新
          </Typography>

          {/* 剩余时间 */}
          <Chip
            label={`剩余时间: ${getRemainingTime()}`}
            color={pairingInfo && pairingInfo.expires_at - Date.now() / 1000 > 60 ? 'primary' : 'error'}
            sx={{ mb: 2 }}
          />

          {/* 复制链接按钮 */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyLink}
            sx={{ color: '#fff', borderColor: '#555' }}
          >
            {copied ? '已复制' : '复制链接'}
          </Button>
        </Box>

        {/* 右侧 - 网络信息 */}
        <Box sx={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 2, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            网络信息
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              本机IP地址
            </Typography>
            {pairingInfo?.local_ips.map((ip, index) => (
              <Chip
                key={index}
                label={ip}
                sx={{ mr: 1, mb: 1 }}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              端口
            </Typography>
            <Typography variant="body1">{pairingInfo?.port || '8888'}</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              配对链接
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={pairingInfo?.qr_content || ''}
              InputProps={{
                readOnly: true,
              }}
              sx={{ backgroundColor: '#fff' }}
            />
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            确保移动端和桌面端在同一局域网，然后扫描二维码或输入配对码
          </Alert>
        </Box>
      </Box>

      {/* 已授权设备列表 */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        已授权设备
      </Typography>
      
      <TableContainer component={Box} sx={{ backgroundColor: '#fff', borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>设备名称</TableCell>
              <TableCell>设备类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>最后活跃</TableCell>
              <TableCell>授权时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>
                  <Typography fontWeight={500}>{device.device_name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={device.device_type === 'mobile' ? '移动端' : '桌面端'}
                    color={device.device_type === 'mobile' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CircleIcon
                      sx={{
                        fontSize: 12,
                        color: isDeviceOnline(device) ? '#10b981' : '#ef4444',
                      }}
                    />
                    <Typography variant="body2">
                      {isDeviceOnline(device) ? '在线' : '离线'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{formatTime(device.last_active_at)}</TableCell>
                <TableCell>{device.created_at}</TableCell>
                <TableCell align="right">
                  <Tooltip title="踢除设备">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedDevice(device);
                        setOpenRevokeDialog(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 踢除设备确认对话框 */}
      <Dialog
        open={openRevokeDialog}
        onClose={() => setOpenRevokeDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>确认踢除设备</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要踢除设备 "{selectedDevice?.device_name}" 吗？踢除后该设备需要重新配对才能连接。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRevokeDialog(false)}>取消</Button>
          <Button onClick={handleRevokeDevice} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : '确认踢除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DevicePairingPage;
