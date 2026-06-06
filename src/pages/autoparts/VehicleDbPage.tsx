import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

export default function VehicleDbPage() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ brand: '', series: '', year_range: '', displacement: '' });

  useEffect(() => { loadModels(); }, []);
  const loadModels = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('ap_get_vehicle_models'); if (r?.models) setModels(r.models); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const addModel = async () => {
    try {
      await safeInvoke('ap_add_vehicle_model', { brand: form.brand, series: form.series || null, yearRange: form.year_range || null, displacement: form.displacement || null });
      setShowAdd(false); setForm({ brand: '', series: '', year_range: '', displacement: '' }); loadModels();
    } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eef2ff' }}><CircularProgress sx={{ color: '#4f46e5' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#eef2ff', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#4f46e5' }}>车型库</Typography><Typography variant="body2" color="text.secondary">共 {models.length} 个车型 · 品牌→车系→年款→排量</Typography></Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ bgcolor: '#4f46e5' }}>新增车型</Button>
        </Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#eef2ff' }}><TableCell>品牌</TableCell><TableCell>车系</TableCell><TableCell>年款</TableCell><TableCell>排量</TableCell><TableCell>创建时间</TableCell></TableRow></TableHead>
          <TableBody>{models.map((m: any) => (
            <TableRow key={m.id} hover><TableCell><Chip label={m.brand} size="small" color="primary" variant="outlined" /></TableCell><TableCell>{m.series || '-'}</TableCell><TableCell>{m.year_range || '-'}</TableCell><TableCell>{m.displacement || '-'}</TableCell><TableCell>{m.created_at?.slice(0, 10)}</TableCell></TableRow>
          ))}
          {models.length === 0 && <TableRow><TableCell colSpan={5} align="center">暂无车型数据，请点击"新增车型"添加</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增车型</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField label="品牌" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} fullWidth required placeholder="如: 丰田" /></Grid>
            <Grid item xs={6}><TextField label="车系" value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))} fullWidth placeholder="如: 卡罗拉" /></Grid>
            <Grid item xs={6}><TextField label="年款" value={form.year_range} onChange={e => setForm(f => ({ ...f, year_range: e.target.value }))} fullWidth placeholder="如: 2020-2023" /></Grid>
            <Grid item xs={6}><TextField label="排量" value={form.displacement} onChange={e => setForm(f => ({ ...f, displacement: e.target.value }))} fullWidth placeholder="如: 1.8L" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={addModel} sx={{ bgcolor: '#4f46e5' }} disabled={!form.brand}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
