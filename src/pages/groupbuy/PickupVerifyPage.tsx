import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, Snackbar, CircularProgress } from '@mui/material';
import { QrCodeScanner as ScanIcon, CheckCircle } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

export default function PickupVerifyPage() {
  const [pickupCode, setPickupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleVerify = async () => {
    if (!pickupCode.trim()) return;
    setLoading(true); setResult(null);
    try {
      // Search order by pickup code
      const orders = await safeInvoke<any>('gb_get_orders', { groupId: pickupCode.trim() });
      if (orders?.orders?.length > 0) {
        const order = orders.orders[0];
        const r = await safeInvoke<any>('gb_verify_pickup', { orderId: order.id, pickupCode: pickupCode.trim() });
        setResult(r);
        setSnackbar({ open: true, message: r?.verified ? '核销成功!' : (r?.message || '核销失败'), severity: r?.verified ? 'success' : 'error' });
      } else {
        setSnackbar({ open: true, message: '未找到对应订单', severity: 'error' });
      }
    } catch (e: any) { setSnackbar({ open: true, message: '核销失败: ' + (e?.message || '未知错误'), severity: 'error' }); }
    setLoading(false); setPickupCode('');
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#ecfeff' }}>
      <Paper sx={{ p: 4, maxWidth: 450, width: '100%', textAlign: 'center' }} elevation={3}>
        <CheckCircle sx={{ fontSize: 60, color: '#0891b2', mb: 2 }} />
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#0891b2', mb: 1 }}>到货核销</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>扫描或输入提货码进行核销</Typography>
        <TextField fullWidth placeholder="输入提货码/订单号" value={pickupCode} onChange={e => setPickupCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }} autoFocus sx={{ mb: 2 }} />
        <Button variant="contained" fullWidth onClick={handleVerify} disabled={loading || !pickupCode.trim()}
          sx={{ bgcolor: '#0891b2', py: 1.5 }} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScanIcon />}>
          {loading ? '核销中...' : '确认核销'}
        </Button>
        {result && (
          <Alert severity={result.verified ? 'success' : 'error'} sx={{ mt: 2 }}>
            {result.message}
          </Alert>
        )}
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={2000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
