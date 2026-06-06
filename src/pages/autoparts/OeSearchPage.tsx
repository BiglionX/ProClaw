import { useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, InputAdornment } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

export default function OeSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product_id: '', oe_number: '', vehicle_model_id: '', part_category: '' });

  const doSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const r = await safeInvoke<any>('ap_search_by_oe', { oeNumber: keyword.trim() });
      if (r?.results) setResults(r.results); else setResults([]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  const addOeNumber = async () => {
    try {
      await safeInvoke('ap_add_oe_number', { productId: form.product_id, oeNumber: form.oe_number, vehicleModelId: form.vehicle_model_id || null, partCategory: form.part_category || null });
      setShowAdd(false); setForm({ product_id: '', oe_number: '', vehicle_model_id: '', part_category: '' });
    } catch (e) { console.error(e); }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#eef2ff', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#4f46e5' }}>OE号查询</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowAdd(true)} sx={{ color: '#4f46e5', borderColor: '#4f46e5' }}>新增OE号</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" placeholder="输入OE号查询..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#4f46e5' }} /></InputAdornment> }} />
          <Button variant="contained" onClick={doSearch} disabled={!keyword.trim()} sx={{ bgcolor: '#4f46e5', minWidth: 100 }}>查询</Button>
        </Box>
      </Paper>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#4f46e5' }} /></Box> :
      searched && <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#eef2ff' }}><TableCell>OE号</TableCell><TableCell>商品名称</TableCell><TableCell>品牌</TableCell><TableCell>车系</TableCell><TableCell>年款</TableCell><TableCell>配件分类</TableCell></TableRow></TableHead>
          <TableBody>{results.map((r: any) => (
            <TableRow key={r.id} hover><TableCell><Chip label={r.oe_number} size="small" sx={{ fontWeight: 'bold' }} /></TableCell><TableCell>{r.product_name || '-'}</TableCell><TableCell>{r.brand || '-'}</TableCell><TableCell>{r.series || '-'}</TableCell><TableCell>{r.year_range || '-'}</TableCell><TableCell>{r.part_category || '-'}</TableCell></TableRow>
          ))}
          {results.length === 0 && <TableRow><TableCell colSpan={6} align="center">未找到匹配的OE号</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增OE号</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField label="商品ID" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} fullWidth required /></Grid>
            <Grid item xs={6}><TextField label="OE号" value={form.oe_number} onChange={e => setForm(f => ({ ...f, oe_number: e.target.value }))} fullWidth required /></Grid>
            <Grid item xs={6}><TextField label="车型ID" value={form.vehicle_model_id} onChange={e => setForm(f => ({ ...f, vehicle_model_id: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="配件分类" value={form.part_category} onChange={e => setForm(f => ({ ...f, part_category: e.target.value }))} fullWidth placeholder="如: 发动机/底盘/电器" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setShowAdd(false)}>取消</Button><Button variant="contained" onClick={addOeNumber} sx={{ bgcolor: '#4f46e5' }} disabled={!form.product_id || !form.oe_number}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
