import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Add as AddIcon, Pets as PetsIcon,
} from '@mui/icons-material';

interface GroomingRecord {
  id: string;
  pet_name: string;
  owner_name: string;
  service_items: string;
  employee_name: string;
  scheduled_at: string;
  completed_at: string | null;
  amount: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
}

const MOCK_SERVICE_ITEMS = ['基础洗护', '精洗', '剪毛造型', 'SPA护理', '修甲', '耳道清洁'];

const MOCK_RECORDS: GroomingRecord[] = [
  { id: 'g1', pet_name: '小黄', owner_name: '张三', service_items: '基础洗护+剪毛造型', employee_name: '美容师小李', scheduled_at: '2026-05-30 10:00', completed_at: null, amount: 128, status: 'scheduled', notes: '' },
  { id: 'g2', pet_name: '咪咪', owner_name: '李四', service_items: '精洗+SPA护理', employee_name: '美容师小李', scheduled_at: '2026-05-30 14:00', completed_at: null, amount: 188, status: 'scheduled', notes: '猫咪胆小需注意' },
  { id: 'g3', pet_name: '小黑', owner_name: '王五', service_items: '基础洗护', employee_name: '美容师小张', scheduled_at: '2026-05-29 09:00', completed_at: '2026-05-29 10:15', amount: 68, status: 'completed', notes: '' },
  { id: 'g4', pet_name: '豆豆', owner_name: '赵六', service_items: '精洗+修甲', employee_name: '美容师小李', scheduled_at: '2026-05-29 15:00', completed_at: '2026-05-29 16:00', amount: 98, status: 'completed', notes: '' },
];

export default function GroomingPage() {
  const [records, setRecords] = useState<GroomingRecord[]>(MOCK_RECORDS);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    pet_name: '', owner_name: '', employee_name: '',
    service_items: '', scheduled_date: '2026-05-30', scheduled_time: '10:00', notes: '',
  });

  const upcoming = records.filter((r) => r.status === 'scheduled' || r.status === 'in_progress');
  const history = records.filter((r) => r.status === 'completed' || r.status === 'cancelled');

  function handleCreate() {
    const id = `g${Date.now()}`;
    setRecords((prev) => [...prev, {
      id, pet_name: newRecord.pet_name, owner_name: newRecord.owner_name,
      service_items: newRecord.service_items, employee_name: newRecord.employee_name,
      scheduled_at: `${newRecord.scheduled_date} ${newRecord.scheduled_time}`,
      completed_at: null, amount: 0, status: 'scheduled', notes: newRecord.notes,
    }]);
    setDialogOpen(false);
    setNewRecord({ pet_name: '', owner_name: '', employee_name: '', service_items: '', scheduled_date: '2026-05-30', scheduled_time: '10:00', notes: '' });
  }

  function handleStatusChange(id: string, newStatus: GroomingRecord['status']) {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toLocaleString('zh-CN') : r.completed_at } : r));
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* 顶部 */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
          🛁 洗护服务
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#f59e0b' }} onClick={() => setDialogOpen(true)}>
          新建预约
        </Button>
      </Paper>

      <Paper sx={{ borderRadius: 0 }} elevation={0}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`待服务 (${upcoming.length})`} />
          <Tab label={`历史 (${history.length})`} />
        </Tabs>
      </Paper>

      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {tabValue === 0 ? (
          <Grid container spacing={2}>
            {upcoming.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.id}>
                <Card sx={{ border: r.status === 'scheduled' ? '2px solid #f59e0b40' : '2px solid #2196f340' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PetsIcon sx={{ color: '#f59e0b' }} />
                      <Typography variant="h6" fontWeight="bold">{r.pet_name}</Typography>
                      <Chip label={r.status === 'scheduled' ? '待服务' : '服务中'} size="small" color={r.status === 'scheduled' ? 'warning' : 'info'} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">主人：{r.owner_name}</Typography>
                    <Typography variant="body2" color="text.secondary">服务：{r.service_items}</Typography>
                    <Typography variant="body2" color="text.secondary">技师：{r.employee_name}</Typography>
                    <Typography variant="body2" color="text.secondary">时间：{r.scheduled_at}</Typography>
                    {r.notes && <Typography variant="caption" color="error">{r.notes}</Typography>}
                  </CardContent>
                  <CardActions>
                    {r.status === 'scheduled' && (
                      <>
                        <Button size="small" variant="contained" color="info" onClick={() => handleStatusChange(r.id, 'in_progress')}>开始服务</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleStatusChange(r.id, 'cancelled')}>取消</Button>
                      </>
                    )}
                    {r.status === 'in_progress' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(r.id, 'completed')}>完成服务</Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {upcoming.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>暂无洗护预约</Typography>
              </Grid>
            )}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>宠物</TableCell><TableCell>主人</TableCell><TableCell>服务项目</TableCell>
                  <TableCell>技师</TableCell><TableCell>时间</TableCell><TableCell>金额</TableCell><TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.pet_name}</TableCell>
                    <TableCell>{r.owner_name}</TableCell>
                    <TableCell>{r.service_items}</TableCell>
                    <TableCell>{r.employee_name}</TableCell>
                    <TableCell>{r.scheduled_at}</TableCell>
                    <TableCell>¥{r.amount}</TableCell>
                    <TableCell><Chip label={r.status === 'completed' ? '已完成' : '已取消'} size="small" color={r.status === 'completed' ? 'success' : 'default'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 新建预约对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f59e0b', color: 'white' }}>🛁 预约洗护</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="宠物名称" value={newRecord.pet_name} onChange={(e) => setNewRecord({ ...newRecord, pet_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="主人姓名" value={newRecord.owner_name} onChange={(e) => setNewRecord({ ...newRecord, owner_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="技师" value={newRecord.employee_name} onChange={(e) => setNewRecord({ ...newRecord, employee_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>服务项目</InputLabel>
                <Select value={newRecord.service_items} label="服务项目" onChange={(e) => setNewRecord({ ...newRecord, service_items: e.target.value })}>
                  {MOCK_SERVICE_ITEMS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="日期" type="date" value={newRecord.scheduled_date} onChange={(e) => setNewRecord({ ...newRecord, scheduled_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="时间" type="time" value={newRecord.scheduled_time} onChange={(e) => setNewRecord({ ...newRecord, scheduled_time: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="备注" multiline rows={2} value={newRecord.notes} onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#f59e0b' }} onClick={handleCreate} disabled={!newRecord.pet_name}>确认预约</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
