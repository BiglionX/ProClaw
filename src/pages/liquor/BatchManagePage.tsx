import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface Batch {
  id: string;
  batch_no: string;
  product_id: string;
  product_name?: string;
  production_date?: string;
  expiry_date?: string;
  purchase_quantity: number;
  remain_quantity: number;
  supplier_id?: string;
  supplier_name?: string;
  created_at: string;
}

export default function BatchManagePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    batch_no: '', product_id: '', production_date: '',
    expiry_date: '', purchase_quantity: '', supplier_id: '',
  });

  useEffect(() => { loadBatches(); }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const result = await safeInvoke<any>('lw_get_batches');
      if (result?.batches) setBatches(result.batches);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addBatch = async () => {
    if (!form.batch_no || !form.product_id) return;
    try {
      await safeInvoke('lw_create_batch', {
        batchNo: form.batch_no,
        productId: form.product_id,
        productionDate: form.production_date || null,
        expiryDate: form.expiry_date || null,
        purchaseQuantity: parseInt(form.purchase_quantity) || 0,
        supplierId: form.supplier_id || null,
      });
      setShowAdd(false);
      setForm({ batch_no: '', product_id: '', production_date: '', expiry_date: '', purchase_quantity: '', supplier_id: '' });
      loadBatches();
    } catch (e) { console.error(e); }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { label: '无期限', color: 'default' as const };
    const daysUntil = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (daysUntil < 0) return { label: '已过期', color: 'error' as const };
    if (daysUntil < 30) return { label: `${daysUntil}天后过期`, color: 'warning' as const };
    if (daysUntil < 90) return { label: `${daysUntil}天`, color: 'info' as const };
    return { label: '有效', color: 'success' as const };
  };

  if (loading) {
    return (
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fef2f2' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#fef2f2', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#dc2626' }}>
              批次管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              共 {batches.length} 个批次 · 追踪入库→库存→出库
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => setShowAdd(true)}
            sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
            新增批次
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fef2f2' }}>
              <TableCell>批次号</TableCell>
              <TableCell>商品名称</TableCell>
              <TableCell align="right">采购数量</TableCell>
              <TableCell align="right">剩余数量</TableCell>
              <TableCell>生产日期</TableCell>
              <TableCell>到期日期</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map(batch => {
              const expiry = getExpiryStatus(batch.expiry_date);
              return (
                <TableRow key={batch.id} hover sx={{ bgcolor: expiry.color === 'error' ? '#fff5f5' : 'inherit' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{batch.batch_no}</TableCell>
                  <TableCell>{batch.product_name || batch.product_id}</TableCell>
                  <TableCell align="right">{batch.purchase_quantity}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: batch.remain_quantity < batch.purchase_quantity * 0.2 ? '#dc2626' : 'inherit' }}>
                    {batch.remain_quantity}
                  </TableCell>
                  <TableCell>{batch.production_date || '-'}</TableCell>
                  <TableCell>{batch.expiry_date || '-'}</TableCell>
                  <TableCell>{batch.supplier_name || batch.supplier_id || '-'}</TableCell>
                  <TableCell><Chip label={expiry.label} color={expiry.color} size="small" /></TableCell>
                </TableRow>
              );
            })}
            {batches.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">暂无批次记录</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增批次</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField label="批次号" value={form.batch_no}
                onChange={e => setForm(f => ({ ...f, batch_no: e.target.value }))} fullWidth required />
            </Grid>
            <Grid item xs={6}>
              <TextField label="商品ID" value={form.product_id}
                onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} fullWidth required />
            </Grid>
            <Grid item xs={6}>
              <TextField label="生产日期" type="date" value={form.production_date}
                onChange={e => setForm(f => ({ ...f, production_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField label="到期日期" type="date" value={form.expiry_date}
                onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField label="采购数量" type="number" value={form.purchase_quantity}
                onChange={e => setForm(f => ({ ...f, purchase_quantity: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField label="供应商ID" value={form.supplier_id}
                onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} fullWidth />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdd(false)}>取消</Button>
          <Button variant="contained" onClick={addBatch}
            disabled={!form.batch_no || !form.product_id}
            sx={{ bgcolor: '#dc2626' }}>确认添加</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
