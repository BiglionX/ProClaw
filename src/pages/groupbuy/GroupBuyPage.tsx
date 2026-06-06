import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

const statusLabels: Record<string, string> = { draft: '草稿', open: '开团中', closed: '已截团', procurement: '采购中', distributing: '分货中', completed: '已完成' };
const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'info' | 'error'> = { draft: 'default', open: 'success', closed: 'warning', procurement: 'info', distributing: 'info', completed: 'primary' };

export default function GroupBuyPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', start_at: '', end_at: '', min_participants: '1' });

  useEffect(() => { loadGroups(); }, []);
  const loadGroups = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('gb_get_groups'); if (r?.groups) setGroups(r.groups); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const addGroup = async () => {
    try { await safeInvoke('gb_create_group', { name: form.name, startAt: form.start_at, endAt: form.end_at, minParticipants: parseInt(form.min_participants) || 1 }); setShowAdd(false); loadGroups(); } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#ecfeff' }}><CircularProgress sx={{ color: '#0891b2' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#ecfeff', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#0891b2' }}>团购管理</Typography><Typography variant="body2" color="text.secondary">共 {groups.length} 个团期</Typography></Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ bgcolor: '#0891b2' }}>新建团购</Button>
        </Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#ecfeff' }}><TableCell>团购名称</TableCell><TableCell>开始时间</TableCell><TableCell>结束时间</TableCell><TableCell>成团人数</TableCell><TableCell>状态</TableCell></TableRow></TableHead>
          <TableBody>{groups.map((g: any) => (
            <TableRow key={g.id} hover><TableCell sx={{ fontWeight: 'bold' }}>{g.name}</TableCell><TableCell>{g.start_at}</TableCell><TableCell>{g.end_at}</TableCell><TableCell>{g.min_participants}</TableCell><TableCell><Chip label={statusLabels[g.status] || g.status} color={statusColors[g.status] || 'default'} size="small" /></TableCell></TableRow>
          ))}
          {groups.length === 0 && <TableRow><TableCell colSpan={5} align="center">暂无团购</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建团购</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField label="团购名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="开始时间" type="datetime-local" value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="结束时间" type="datetime-local" value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="成团人数" type="number" value={form.min_participants} onChange={e => setForm(f => ({ ...f, min_participants: e.target.value }))} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={addGroup} sx={{ bgcolor: '#0891b2' }}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
