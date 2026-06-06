import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';
import { format } from 'date-fns';

export default function DeliveryPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ driver_name: '' });

  useEffect(() => { loadRoutes(); }, []);
  const loadRoutes = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('ff_get_delivery_routes', { date: today }); if (r?.routes) setRoutes(r.routes); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const addRoute = async () => {
    try { await safeInvoke('ff_create_delivery_route', { routeDate: today, driverName: form.driver_name || null, stops: [] }); setShowAdd(false); loadRoutes(); } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0fdf4' }}><CircularProgress sx={{ color: '#16a34a' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#f0fdf4', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#16a34a' }}>配送管理</Typography><Typography variant="body2" color="text.secondary">{today} · 共 {routes.length} 条路线</Typography></Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ bgcolor: '#16a34a' }}>新增路线</Button>
        </Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#f0fdf4' }}><TableCell>路线日期</TableCell><TableCell>司机</TableCell><TableCell>停靠点数</TableCell><TableCell>状态</TableCell><TableCell>创建时间</TableCell></TableRow></TableHead>
          <TableBody>{routes.map((r: any) => {
            const stops = r.stops ? JSON.parse(r.stops) : [];
            return (<TableRow key={r.id} hover><TableCell>{r.route_date}</TableCell><TableCell>{r.driver_name || '-'}</TableCell><TableCell>{Array.isArray(stops) ? stops.length : 0}</TableCell><TableCell><Chip label={r.status === 'pending' ? '待配送' : r.status === 'in_progress' ? '配送中' : '已完成'} color={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'default'} size="small" /></TableCell><TableCell>{r.created_at?.substring(0, 19)}</TableCell></TableRow>);
          })}
          {routes.length === 0 && <TableRow><TableCell colSpan={5} align="center">今日暂无配送路线</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新增配送路线</DialogTitle>
        <DialogContent><TextField label="司机姓名" value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} fullWidth sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={addRoute} sx={{ bgcolor: '#16a34a' }}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
