import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

export default function DeviceModelsPage() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ brand: '', model_name: '', release_year: '' });

  useEffect(() => { loadModels(); }, []);
  const loadModels = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('pa_get_device_models'); if (r?.models) setModels(r.models); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const addModel = async () => {
    try { await safeInvoke('pa_add_device_model', { brand: form.brand, modelName: form.model_name, releaseYear: form.release_year ? parseInt(form.release_year) : null }); setShowAdd(false); loadModels(); } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eff6ff' }}><CircularProgress sx={{ color: '#2563eb' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#eff6ff', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#2563eb' }}>兼容机型库</Typography><Typography variant="body2" color="text.secondary">共 {models.length} 个机型</Typography></Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ bgcolor: '#2563eb' }}>新增机型</Button>
        </Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#eff6ff' }}><TableCell>品牌</TableCell><TableCell>型号</TableCell><TableCell>发布年份</TableCell><TableCell>状态</TableCell></TableRow></TableHead>
          <TableBody>{models.map((m: any) => (
            <TableRow key={m.id} hover><TableCell><Chip label={m.brand} size="small" /></TableCell><TableCell>{m.model_name}</TableCell><TableCell>{m.release_year || '-'}</TableCell><TableCell><Chip label={m.is_active ? '在用' : '停用'} color={m.is_active ? 'success' : 'default'} size="small" /></TableCell></TableRow>
          ))}
          {models.length === 0 && <TableRow><TableCell colSpan={4} align="center">暂无机型</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增机型</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField label="品牌" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="型号" value={form.model_name} onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="发布年份" type="number" value={form.release_year} onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={addModel} sx={{ bgcolor: '#2563eb' }}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
