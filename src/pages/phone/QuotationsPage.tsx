import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import { safeInvoke } from '../../lib/tauri';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { loadQuotations(); }, []);
  const loadQuotations = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('pa_get_quotations'); if (r?.quotations) setQuotations(r.quotations); } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eff6ff' }}><CircularProgress sx={{ color: '#2563eb' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#eff6ff', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#2563eb' }}>报价单管理</Typography><Typography variant="body2" color="text.secondary">共 {quotations.length} 份报价单</Typography></Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#eff6ff' }}><TableCell>客户</TableCell><TableCell align="right">金额</TableCell><TableCell>有效期</TableCell><TableCell>状态</TableCell><TableCell>创建时间</TableCell></TableRow></TableHead>
          <TableBody>{quotations.map((q: any) => (
            <TableRow key={q.id} hover><TableCell>{q.customer_name || q.customer_id}</TableCell><TableCell align="right">¥{q.total_amount?.toFixed(2)}</TableCell><TableCell>{q.valid_until || '-'}</TableCell><TableCell><Chip label={q.status === 'draft' ? '草稿' : q.status === 'sent' ? '已发送' : q.status === 'accepted' ? '已接受' : q.status} color={q.status === 'accepted' ? 'success' : q.status === 'sent' ? 'info' : 'default'} size="small" /></TableCell><TableCell>{q.created_at?.substring(0, 19)}</TableCell></TableRow>
          ))}
          {quotations.length === 0 && <TableRow><TableCell colSpan={5} align="center">暂无报价单</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
    </Box>
  );
}
