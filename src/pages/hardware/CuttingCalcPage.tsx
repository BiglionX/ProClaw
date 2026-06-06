import { useState } from 'react';
import { Box, Typography, Paper, Button, TextField, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton, Chip } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface Piece { width: number; height: number; label: string; }

export default function CuttingCalcPage() {
  const [sheetW, setSheetW] = useState('2440');
  const [sheetH, setSheetH] = useState('1220');
  const [pieces, setPieces] = useState<Piece[]>([{ width: 600, height: 400, label: '件1' }]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addPiece = () => setPieces([...pieces, { width: 0, height: 0, label: `件${pieces.length + 1}` }]);
  const removePiece = (i: number) => setPieces(pieces.filter((_, idx) => idx !== i));
  const updatePiece = (i: number, field: keyof Piece, value: string | number) => {
    const updated = [...pieces];
    (updated[i] as any)[field] = field === 'label' ? value : Number(value);
    setPieces(updated);
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const r = await safeInvoke<any>('hw_calculate_cutting', {
        sheetWidth: Number(sheetW), sheetHeight: Number(sheetH),
        pieces: pieces.map(p => ({ width: p.width, height: p.height, label: p.label }))
      });
      setResult(r);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#f8fafc', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#64748b' }}>板材切割计算</Typography>
        <Typography variant="body2" color="text.secondary">输入板材尺寸和下料件，计算最优切割方案</Typography>
      </Paper>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }} elevation={1}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>板材尺寸</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField label="宽度 (mm)" type="number" value={sheetW} onChange={e => setSheetW(e.target.value)} size="small" fullWidth />
              <TextField label="高度 (mm)" type="number" value={sheetH} onChange={e => setSheetH(e.target.value)} size="small" fullWidth />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">下料件列表</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addPiece} sx={{ color: '#64748b' }}>添加</Button>
            </Box>
            {pieces.map((p, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField size="small" label="标签" value={p.label} onChange={e => updatePiece(i, 'label', e.target.value)} sx={{ width: 80 }} />
                <TextField size="small" label="宽" type="number" value={p.width || ''} onChange={e => updatePiece(i, 'width', e.target.value)} sx={{ width: 80 }} />
                <TextField size="small" label="高" type="number" value={p.height || ''} onChange={e => updatePiece(i, 'height', e.target.value)} sx={{ width: 80 }} />
                <IconButton size="small" onClick={() => removePiece(i)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
            <Button variant="contained" onClick={calculate} disabled={loading} fullWidth sx={{ mt: 2, bgcolor: '#64748b' }}>
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : '计算切割方案'}
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          {result && (
            <Paper sx={{ p: 2 }} elevation={1}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>计算结果</Typography>
              <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">板材</Typography>
                  <Typography fontWeight="bold">{result.plan?.sheet?.width} x {result.plan?.sheet?.height} mm</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">下料件数</Typography>
                  <Typography fontWeight="bold">{result.plan?.pieces?.length || 0} 件</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">利用率</Typography>
                  <Chip label={`${result.utilization_rate}%`} color={result.utilization_rate >= 80 ? 'success' : result.utilization_rate >= 50 ? 'warning' : 'error'} size="small" />
                </Box>
              </Box>
              <TableContainer>
                <Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f1f5f9' }}><TableCell>序号</TableCell><TableCell>标签</TableCell><TableCell>宽 (mm)</TableCell><TableCell>高 (mm)</TableCell><TableCell>位置 X/Y</TableCell></TableRow></TableHead>
                  <TableBody>{result.plan?.layout?.map((l: any) => (
                    <TableRow key={l.index} hover><TableCell>{l.index + 1}</TableCell><TableCell>{l.label}</TableCell><TableCell>{l.width}</TableCell><TableCell>{l.height}</TableCell><TableCell>({l.x}, {l.y})</TableCell></TableRow>
                  ))}</TableBody></Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
