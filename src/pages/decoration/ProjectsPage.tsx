import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Tabs, Tab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

const STATUS_LABELS: Record<string, string> = { active: '进行中', completed: '已完成', paused: '已暂停' };
const STATUS_COLORS: Record<string, 'success' | 'default' | 'warning'> = { active: 'success', completed: 'default', paused: 'warning' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', customer_id: '', address: '', budget: '', start_date: '' });

  useEffect(() => { loadProjects(); }, [filter]);
  const loadProjects = async () => {
    setLoading(true);
    try {
      const r = await safeInvoke<any>('dm_get_projects', { status: filter || null });
      if (r?.projects) setProjects(r.projects);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  const createProject = async () => {
    try {
      await safeInvoke('dm_create_project', {
        name: form.name, customerId: form.customer_id || null, address: form.address || null,
        budget: form.budget ? Number(form.budget) : null, startDate: form.start_date || null
      });
      setShowAdd(false); setForm({ name: '', customer_id: '', address: '', budget: '', start_date: '' }); loadProjects();
    } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fefce8' }}><CircularProgress sx={{ color: '#ca8a04' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#fefce8', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#ca8a04' }}>项目管理</Typography><Typography variant="body2" color="text.secondary">共 {projects.length} 个项目</Typography></Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ bgcolor: '#ca8a04' }}>新增项目</Button>
        </Box>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mt: 1, '& .MuiTab-root': { minWidth: 80 } }}>
          <Tab label="全部" value="" />
          <Tab label="进行中" value="active" />
          <Tab label="已完成" value="completed" />
          <Tab label="已暂停" value="paused" />
        </Tabs>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#fefce8' }}><TableCell>项目名称</TableCell><TableCell>客户</TableCell><TableCell>地址</TableCell><TableCell>状态</TableCell><TableCell>预算</TableCell><TableCell>开始日期</TableCell></TableRow></TableHead>
          <TableBody>{projects.map((p: any) => (
            <TableRow key={p.id} hover>
              <TableCell sx={{ fontWeight: 'bold' }}>{p.name}</TableCell>
              <TableCell>{p.customer_name || '-'}</TableCell>
              <TableCell>{p.address || '-'}</TableCell>
              <TableCell><Chip label={STATUS_LABELS[p.status] || p.status} color={STATUS_COLORS[p.status] || 'default'} size="small" /></TableCell>
              <TableCell>{p.budget ? `¥${p.budget.toFixed(2)}` : '-'}</TableCell>
              <TableCell>{p.start_date?.slice(0, 10) || '-'}</TableCell>
            </TableRow>
          ))}
          {projects.length === 0 && <TableRow><TableCell colSpan={6} align="center">暂无项目数据</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增项目</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField label="项目名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required /></Grid>
            <Grid item xs={6}><TextField label="客户ID" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="预算" type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12}><TextField label="地址" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} fullWidth multiline rows={2} /></Grid>
            <Grid item xs={6}><TextField label="开始日期" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={createProject} sx={{ bgcolor: '#ca8a04' }} disabled={!form.name}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
