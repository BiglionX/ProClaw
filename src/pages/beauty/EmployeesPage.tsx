import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Avatar, IconButton,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon,
  Phone as PhoneIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

function parseServiceIds(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* plain */ }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  hire_date: string;
  service_ids: string[];
  commission_rate: number;
  is_active: boolean;
}

const FALLBACK_SERVICES = ['剪发', '染发', '烫发', '面部护理', 'SPA套餐', '美甲'];

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', name: '发型师小王', phone: '1380002001', hire_date: '2024-01-15', service_ids: ['剪发', '染发', '烫发'], commission_rate: 0.3, is_active: true },
  { id: 'e2', name: '美容师小刘', phone: '1380002002', hire_date: '2024-03-01', service_ids: ['面部护理', 'SPA套餐'], commission_rate: 0.35, is_active: true },
  { id: 'e3', name: '美甲师小李', phone: '1380002003', hire_date: '2024-06-10', service_ids: ['美甲'], commission_rate: 0.4, is_active: true },
  { id: 'e4', name: '发型师小张', phone: '1380002004', hire_date: '2025-02-20', service_ids: ['剪发'], commission_rate: 0.25, is_active: false },
];

const emptyEmployee: Employee = {
  id: '', name: '', phone: '', hire_date: '', service_ids: [], commission_rate: 0.3, is_active: true,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [serviceOptions, setServiceOptions] = useState<string[]>(FALLBACK_SERVICES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee>(emptyEmployee);

  const loadEmployees = useCallback(async () => {
    try {
      const [empRes, svcRes] = await Promise.all([
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_employees', {}),
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_services', {}),
      ]);
      const rows = empRes?.data ?? [];
      if (rows.length > 0) {
        setEmployees(rows.map((e) => ({
          id: String(e.id ?? ''),
          name: String(e.name ?? ''),
          phone: String(e.phone ?? ''),
          hire_date: String(e.hire_date ?? ''),
          service_ids: parseServiceIds(e.service_ids),
          commission_rate: Number(e.commission_rate ?? 0),
          is_active: Boolean(e.is_active ?? true),
        })));
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
    loadEmployees();
  }, [loadEmployees]);

  function handleOpen(emp?: Employee) {
    setEditing(emp || emptyEmployee);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing.id) {
      setEmployees((prev) => prev.map((e) => e.id === editing.id ? editing : e));
    } else {
      try {
        await safeInvoke('beauty_create_employee', {
          name: editing.name,
          phone: editing.phone,
          serviceIds: editing.service_ids,
          commissionRate: editing.commission_rate,
        });
        await loadEmployees();
      } catch {
        setEmployees((prev) => [...prev, { ...editing, id: `e${Date.now()}` }]);
      }
    }
    setDialogOpen(false);
  }

  function handleToggleActive(id: string) {
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, is_active: !e.is_active } : e));
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#fdf2f8' }}>
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>👥 员工管理</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#ec4899' }} onClick={() => handleOpen()}>新增员工</Button>
      </Paper>

      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {employees.map((emp) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
              <Card sx={{ opacity: emp.is_active ? 1 : 0.6 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#ec4899', width: 56, height: 56 }}>
                      {emp.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{emp.name}</Typography>
                      <Chip
                        label={emp.is_active ? '在职' : '离职'}
                        size="small"
                        color={emp.is_active ? 'success' : 'default'}
                        icon={emp.is_active ? <ActiveIcon /> : undefined}
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <PhoneIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    {emp.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    入职：{emp.hire_date}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    提成：{(emp.commission_rate * 100)}%
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {emp.service_ids.map((s) => (
                      <Chip key={s} label={s} size="small" variant="outlined" color="secondary" />
                    ))}
                  </Box>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleOpen(emp)}><EditIcon /></IconButton>
                  <Button size="small" color={emp.is_active ? 'warning' : 'success'} onClick={() => handleToggleActive(emp.id)}>
                    {emp.is_active ? '离职' : '复职'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ec4899', color: 'white' }}>
          {editing.id ? '✏️ 编辑员工' : '👤 新增员工'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="姓名" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="电话" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="入职日期" type="date" value={editing.hire_date} onChange={(e) => setEditing({ ...editing, hire_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="提成比例 (%)" type="number" value={editing.commission_rate * 100} onChange={(e) => setEditing({ ...editing, commission_rate: Number(e.target.value) / 100 })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>服务项目（可多选）</InputLabel>
                <Select
                  multiple
                  value={editing.service_ids}
                  label="服务项目（可多选）"
                  onChange={(e) => setEditing({ ...editing, service_ids: e.target.value as string[] })}
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  {serviceOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#ec4899' }} onClick={handleSave} disabled={!editing.name}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
