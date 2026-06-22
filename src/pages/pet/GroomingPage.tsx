import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Add as AddIcon, Pets as PetsIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

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

interface PetOption {
  id: string;
  name: string;
  owner_id: string;
}

const FALLBACK_SERVICE_ITEMS = ['基础洗护', '精洗', '剪毛造型', 'SPA护理', '修甲', '耳道清洁'];

const MOCK_RECORDS: GroomingRecord[] = [
  { id: 'g1', pet_name: '小黄', owner_name: '张三', service_items: '基础洗护+剪毛造型', employee_name: '美容师小李', scheduled_at: '2026-05-30 10:00', completed_at: null, amount: 128, status: 'scheduled', notes: '' },
  { id: 'g2', pet_name: '咪咪', owner_name: '李四', service_items: '精洗+SPA护理', employee_name: '美容师小李', scheduled_at: '2026-05-30 14:00', completed_at: null, amount: 188, status: 'scheduled', notes: '猫咪胆小需注意' },
  { id: 'g3', pet_name: '小黑', owner_name: '王五', service_items: '基础洗护', employee_name: '美容师小张', scheduled_at: '2026-05-29 09:00', completed_at: '2026-05-29 10:15', amount: 68, status: 'completed', notes: '' },
  { id: 'g4', pet_name: '豆豆', owner_name: '赵六', service_items: '精洗+修甲', employee_name: '美容师小李', scheduled_at: '2026-05-29 15:00', completed_at: '2026-05-29 16:00', amount: 98, status: 'completed', notes: '' },
];

function mapApiGrooming(
  row: Record<string, unknown>,
  petMap: Map<string, PetOption>,
): GroomingRecord {
  const petId = String(row.pet_id ?? '');
  const pet = petMap.get(petId);
  const employeeRaw = String(row.employee_id ?? '');
  return {
    id: String(row.id ?? ''),
    pet_name: pet?.name ?? petId,
    owner_name: pet?.owner_id ?? '',
    service_items: String(row.service_items ?? ''),
    employee_name: employeeRaw,
    scheduled_at: String(row.scheduled_at ?? ''),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    amount: Number(row.amount ?? 0),
    status: (String(row.status ?? 'scheduled') as GroomingRecord['status']),
    notes: String(row.notes ?? ''),
  };
}

export default function GroomingPage() {
  const [records, setRecords] = useState<GroomingRecord[]>(MOCK_RECORDS);
  const [serviceOptions, setServiceOptions] = useState<string[]>(FALLBACK_SERVICE_ITEMS);
  const [petOptions, setPetOptions] = useState<PetOption[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    pet_id: '', employee_name: '',
    service_items: '', scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '10:00', notes: '',
  });

  const loadRecords = useCallback(async () => {
    try {
      const [recRes, svcRes, petRes] = await Promise.all([
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('pet_get_grooming_records', {}),
        safeInvoke<{ data?: Array<{ name?: string }> }>('pet_get_grooming_services', {}),
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('pet_get_profiles', {}),
      ]);
      const pets: PetOption[] = (petRes?.data ?? []).map((p) => ({
        id: String(p.id ?? ''),
        name: String(p.name ?? ''),
        owner_id: String(p.owner_id ?? ''),
      }));
      setPetOptions(pets);
      const petMap = new Map(pets.map((p) => [p.id, p]));
      const rows = recRes?.data ?? [];
      if (rows.length > 0) {
        setRecords(rows.map((r) => mapApiGrooming(r, petMap)));
      }
      const svcRows = svcRes?.data ?? [];
      if (svcRows.length > 0) {
        setServiceOptions(svcRows.map((s) => String(s.name ?? '')));
      }
    } catch {
      /* keep mock in browser dev */
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const upcoming = records.filter((r) => r.status === 'scheduled' || r.status === 'in_progress');
  const history = records.filter((r) => r.status === 'completed' || r.status === 'cancelled');

  async function handleCreate() {
    const scheduledAt = `${newRecord.scheduled_date} ${newRecord.scheduled_time}`;
    const pet = petOptions.find((p) => p.id === newRecord.pet_id);
    try {
      await safeInvoke('pet_create_grooming_record', {
        petId: newRecord.pet_id,
        serviceItems: newRecord.service_items,
        employeeId: newRecord.employee_name || null,
        scheduledAt,
        notes: newRecord.notes || null,
      });
      await loadRecords();
    } catch {
      const id = `g${Date.now()}`;
      setRecords((prev) => [...prev, {
        id,
        pet_name: pet?.name ?? newRecord.pet_id,
        owner_name: pet?.owner_id ?? '',
        service_items: newRecord.service_items,
        employee_name: newRecord.employee_name,
        scheduled_at: scheduledAt,
        completed_at: null,
        amount: 0,
        status: 'scheduled',
        notes: newRecord.notes,
      }]);
    }
    setDialogOpen(false);
    setNewRecord({
      pet_id: '', employee_name: '', service_items: '',
      scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '10:00', notes: '',
    });
  }

  async function handleStatusChange(id: string, newStatus: GroomingRecord['status']) {
    const record = records.find((r) => r.id === id);
    try {
      await safeInvoke('pet_update_grooming_status', {
        id,
        status: newStatus,
        amount: newStatus === 'completed' ? record?.amount || 0 : undefined,
      });
      await loadRecords();
    } catch {
      setRecords((prev) => prev.map((r) => r.id === id ? {
        ...r,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toLocaleString('zh-CN') : r.completed_at,
      } : r));
    }
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
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
        {(tabValue === 0 ? upcoming : history).length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>暂无记录</Typography>
        ) : tabValue === 0 ? (
          <Grid container spacing={2}>
            {upcoming.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">
                      <PetsIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} />{r.pet_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{r.service_items}</Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {r.employee_name} · {r.scheduled_at}
                    </Typography>
                    {r.notes && <Typography variant="caption" color="warning.main">{r.notes}</Typography>}
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => handleStatusChange(r.id, 'in_progress')}>开始服务</Button>
                    <Button size="small" color="success" onClick={() => handleStatusChange(r.id, 'completed')}>完成</Button>
                    <Button size="small" color="error" onClick={() => handleStatusChange(r.id, 'cancelled')}>取消</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>宠物</TableCell>
                  <TableCell>服务项目</TableCell>
                  <TableCell>美容师</TableCell>
                  <TableCell>预约时间</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.pet_name}</TableCell>
                    <TableCell>{r.service_items}</TableCell>
                    <TableCell>{r.employee_name}</TableCell>
                    <TableCell>{r.scheduled_at}</TableCell>
                    <TableCell>¥{r.amount}</TableCell>
                    <TableCell>
                      <Chip label={r.status === 'completed' ? '已完成' : '已取消'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建洗护预约</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>宠物</InputLabel>
            <Select
              value={newRecord.pet_id}
              label="宠物"
              onChange={(e) => setNewRecord({ ...newRecord, pet_id: e.target.value })}
            >
              {petOptions.length > 0
                ? petOptions.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)
                : <MenuItem value="p1">小黄</MenuItem>}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>服务项目</InputLabel>
            <Select value={newRecord.service_items} label="服务项目" onChange={(e) => setNewRecord({ ...newRecord, service_items: e.target.value })}>
              {serviceOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="美容师" fullWidth value={newRecord.employee_name} onChange={(e) => setNewRecord({ ...newRecord, employee_name: e.target.value })} />
          <TextField label="日期" type="date" fullWidth InputLabelProps={{ shrink: true }} value={newRecord.scheduled_date} onChange={(e) => setNewRecord({ ...newRecord, scheduled_date: e.target.value })} />
          <TextField label="时间" type="time" fullWidth InputLabelProps={{ shrink: true }} value={newRecord.scheduled_time} onChange={(e) => setNewRecord({ ...newRecord, scheduled_time: e.target.value })} />
          <TextField label="备注" fullWidth multiline rows={2} value={newRecord.notes} onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#f59e0b' }} onClick={handleCreate}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
