import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, MenuItem } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

const ROOM_TYPES = [
  { value: '卫生间', label: '卫生间' },
  { value: '厨房', label: '厨房' },
  { value: '客厅', label: '客厅' },
  { value: '全屋', label: '全屋' },
];

export default function MaterialBomPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', room_type: '', items: '[{"name":"","qty":1,"unit":""}]' });

  useEffect(() => { loadTemplates(); }, []);
  const loadTemplates = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('dm_get_bom_templates'); if (r?.templates) setTemplates(r.templates); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const createTemplate = async () => {
    try {
      let items;
      try { items = JSON.parse(form.items); } catch { items = []; }
      await safeInvoke('dm_create_bom_template', { name: form.name, roomType: form.room_type || null, items });
      setShowAdd(false); setForm({ name: '', room_type: '', items: '[{"name":"","qty":1,"unit":""}]' }); loadTemplates();
    } catch (e) { console.error(e); }
  };

  const parseItems = (itemsStr: string) => {
    try { const arr = JSON.parse(itemsStr); return Array.isArray(arr) ? arr.length : 0; } catch { return 0; }
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fefce8' }}><CircularProgress sx={{ color: '#ca8a04' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#fefce8', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#ca8a04' }}>材料清单 (BOM)</Typography><Typography variant="body2" color="text.secondary">共 {templates.length} 个模板</Typography></Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ bgcolor: '#ca8a04' }}>新增模板</Button>
        </Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#fefce8' }}><TableCell>模板名称</TableCell><TableCell>房间类型</TableCell><TableCell>材料项数</TableCell><TableCell>创建时间</TableCell></TableRow></TableHead>
          <TableBody>{templates.map((t: any) => (
            <TableRow key={t.id} hover>
              <TableCell sx={{ fontWeight: 'bold' }}>{t.name}</TableCell>
              <TableCell><Chip label={t.room_type || '通用'} size="small" variant="outlined" /></TableCell>
              <TableCell>{parseItems(t.items)} 项</TableCell>
              <TableCell>{t.created_at?.slice(0, 10)}</TableCell>
            </TableRow>
          ))}
          {templates.length === 0 && <TableRow><TableCell colSpan={4} align="center">暂无BOM模板</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增BOM模板</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField label="模板名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required /></Grid>
            <Grid item xs={6}><TextField label="房间类型" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))} fullWidth select><MenuItem value="">通用</MenuItem>{ROOM_TYPES.map(rt => <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}>
              <TextField label="材料清单 (JSON)" value={form.items} onChange={e => setForm(f => ({ ...f, items: e.target.value }))} fullWidth multiline rows={6}
                helperText='格式: [{"name":"材料名","qty":数量,"unit":"单位"}]'
                sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: 13 } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={createTemplate} sx={{ bgcolor: '#ca8a04' }} disabled={!form.name}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
