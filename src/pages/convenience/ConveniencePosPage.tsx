import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, IconButton,
  List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Divider, Alert, Snackbar, InputAdornment,
} from '@mui/material';
import {
  ShoppingCart as CartIcon, Delete as DeleteIcon,
  Add as AddIcon, Remove as RemoveIcon, Search as SearchIcon,
  Payments as CashIcon, QrCode as QrIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function ConveniencePosPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleScanKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      const code = scanInput.trim();
      try {
        const result = await safeInvoke<any>('filter_products', { keyword: code, limit: 5 });
        if (result?.data && result.data.length > 0) {
          const product = result.data[0];
          addToCart({
            productId: product.id || product.code,
            name: product.name || product.product_name || '未知商品',
            price: product.price || product.sale_price || 0,
            quantity: 1,
          });
          setSnackbar({ open: true, message: `已添加: ${product.name || product.product_name}`, severity: 'success' });
        } else {
          addToCart({ productId: code, name: code, price: 0, quantity: 1 });
          setSnackbar({ open: true, message: `手动录入: ${code}`, severity: 'success' });
        }
      } catch {
        addToCart({ productId: code, name: code, price: 0, quantity: 1 });
        setSnackbar({ open: true, message: `手动录入: ${code}`, severity: 'success' });
      }
      setScanInput('');
    }
  }, [scanInput]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          return newQty <= 0 ? null : { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handlePayment = async (method: string) => {
    const items = cart.map(item => ({
      product_id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    try {
      await safeInvoke<any>('cv_create_pos_order', {
        items,
        paymentMethod: method,
        receivedAmount: method === 'cash' ? parseFloat(receivedAmount) || totalAmount : totalAmount,
      });
      if (method === 'cash' && receivedAmount) {
        setChangeAmount(parseFloat(receivedAmount) - totalAmount);
      }
      setSnackbar({ open: true, message: '收银成功!', severity: 'success' });
      setCart([]);
      setShowPayment(false);
      setReceivedAmount('');
      setTimeout(() => scanRef.current?.focus(), 500);
    } catch {
      setSnackbar({ open: true, message: '收银失败，请重试', severity: 'error' });
    }
  };

  const quickPayment = (method: string) => {
    if (method === 'cash') {
      setShowPayment(true);
    } else {
      handlePayment(method);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', bgcolor: '#fff7ed' }}>
      <Box sx={{ flex: 3, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#f97316', mb: 1 }}>
            收银台
          </Typography>
          <TextField
            fullWidth
            inputRef={scanRef}
            placeholder="扫描或输入商品条码，按回车添加..."
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            onKeyDown={handleScanKeyDown}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            autoFocus
          />
        </Paper>

        <Paper sx={{ flex: 1, overflow: 'auto', mb: 2 }} elevation={1}>
          <List dense>
            {cart.map((item, idx) => (
              <ListItem key={`${item.productId}-${idx}`} divider>
                <ListItemText
                  primary={item.name}
                  secondary={`单价: ¥${item.price.toFixed(2)} | 小计: ¥${(item.price * item.quantity).toFixed(2)}`}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => updateQuantity(item.productId, -1)}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ minWidth: 30, textAlign: 'center' }}>{item.quantity}</Typography>
                  <IconButton size="small" onClick={() => updateQuantity(item.productId, 1)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => removeItem(item.productId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
            {cart.length === 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: 1 }}>
                <CartIcon sx={{ fontSize: 48, color: '#f97316', opacity: 0.2 }} />
                <Typography color="text.secondary">扫描条码开始收银</Typography>
              </Box>
            )}
          </List>
        </Paper>

        <Paper sx={{ p: 2 }} elevation={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">合计</Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#f97316' }}>
              ¥{totalAmount.toFixed(2)}
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" fullWidth disabled={cart.length === 0}
              onClick={() => quickPayment('cash')}
              sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, py: 1.5 }}
              startIcon={<CashIcon />}>现金</Button>
            <Button variant="contained" fullWidth disabled={cart.length === 0}
              onClick={() => quickPayment('wechat')}
              sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' }, py: 1.5 }}
              startIcon={<QrIcon />}>微信</Button>
            <Button variant="contained" fullWidth disabled={cart.length === 0}
              onClick={() => quickPayment('alipay')}
              sx={{ bgcolor: '#1677ff', '&:hover': { bgcolor: '#0958d9' }, py: 1.5 }}
              startIcon={<QrIcon />}>支付宝</Button>
          </Box>
        </Paper>
      </Box>

      <Dialog open={showPayment} onClose={() => setShowPayment(false)} maxWidth="xs" fullWidth>
        <DialogTitle>现金收款</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h3" fontWeight="bold" sx={{ color: '#f97316' }}>¥{totalAmount.toFixed(2)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>应收金额</Typography>
          </Box>
          <TextField fullWidth label="实收金额" type="number"
            value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && receivedAmount && parseFloat(receivedAmount) >= totalAmount) handlePayment('cash'); }}
            autoFocus sx={{ mt: 2 }} />
          {receivedAmount && parseFloat(receivedAmount) >= totalAmount && (
            <Alert severity="success" sx={{ mt: 2 }}>找零: ¥{(parseFloat(receivedAmount) - totalAmount).toFixed(2)}</Alert>
          )}
          {changeAmount !== null && (
            <Alert severity="info" sx={{ mt: 2 }}>已找零: ¥{changeAmount.toFixed(2)}</Alert>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {[10, 20, 50, 100].map(amt => {
              const target = Math.ceil(totalAmount / amt) * amt;
              return <Chip key={amt} label={`¥${target}`} onClick={() => setReceivedAmount(target.toString())}
                color={receivedAmount === target.toString() ? 'primary' : 'default'} variant="outlined" />;
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowPayment(false)}>取消</Button>
          <Button variant="contained" onClick={() => handlePayment('cash')}
            disabled={!receivedAmount || parseFloat(receivedAmount) < totalAmount}
            sx={{ bgcolor: '#16a34a' }}>确认收款 (¥{receivedAmount || '0'})</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={2000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
