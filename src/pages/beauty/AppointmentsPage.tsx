import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

function parseServiceLabel(raw: unknown): string {
  if (typeof raw !== 'string') return String(raw ?? '');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch { /* plain string */ }
  return raw;
}

function mapApiAppointment(row: Record<string, unknown>, employeeMap: Map<string, string>): Appointment {
  const employeeId = String(row.employee_id ?? '');
  return {
    id: String(row.id ?? ''),
    customer_name: String(row.customer_id ?? ''),
    customer_phone: String(row.customer_id ?? ''),
    employee_name: employeeMap.get(employeeId) ?? employeeId,
    service_name: parseServiceLabel(row.service_ids),
    start_at: String(row.start_at ?? ''),
    duration: Number(row.duration ?? 60),
    status: (row.status as Appointment['status']) ?? 'pending',
  };
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  employee_name: string;
  service_name: string;
  start_at: string;
  duration: number;
  status: 'pending' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
}

const NOW = new Date();
const TODAY = NOW.toISOString().split('T')[0];

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1', customer_name: '张女士', customer_phone: '1380001001', employee_name: '发型师小王', service_name: '剪发+染发', start_at: `${TODAY}T09:00`, duration: 120, status: 'checked_in' },
  { id: 'a2', customer_name: '李女士', customer_phone: '1380001002', employee_name: '美容师小刘', service_name: '面部护理', start_at: `${TODAY}T10:30`, duration: 60, status: 'in_progress' },
  { id: 'a3', customer_name: '王小姐', customer_phone: '1380001003', employee_name: '发型师小王', service_name: '洗吹', start_at: `${TODAY}T11:00`, duration: 30, status: 'pending' },
  { id: 'a4', customer_name: '赵女士', customer_phone: '1380001004', employee_name: '美容师小刘', service_name: 'SPA套餐', start_at: `${TODAY}T14:00`, duration: 90, status: 'pending' },
  { id: 'a5', customer_name: '陈女士', customer_phone: '1380001005', employee_name: '发型师小王', service_name: '烫发', start_at: `${TODAY}T15:30`, duration: 180, status: 'pending' },
  { id: 'a6', customer_name: '周小姐', customer_phone: '1380001006', employee_name: '美容师小刘', service_name: '美甲', start_at: `${TODAY}T16:00`, duration: 60, status: 'pending' },
];

const STATUS_CONFIG: Record<Appointment['status'], { label: string; color: string }> = {
  pending: { label: '待服务', color: '#2196f3' },
  checked_in: { label: '已到店', color: '#4caf50' },
  in_progress: { label: '服务中', color: '#ff9800' },
  completed: { label: '已完成', color: '#9e9e9e' },
  cancelled: { label: '已取消', color: '#f44336' },
  no_show: { label: '未到店', color: '#9c27b0' },
};

const MOCK_EMPLOYEES = ['发型师小王', '美容师小刘', '美甲师小李'];
const FALLBACK_SERVICES = ['剪发', '染发', '烫发', '洗吹', '面部护理', 'SPA套餐', '美甲'];

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
}

function getStatusChip(status: Appointment['status']) {
  const c = STATUS_CONFIG[status];
  return <Chip label={c.label} size="small" sx={{ color: 'white', bgcolor: c.color }} />;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function getAppointmentEmoji(status: Appointment['status']): string {
  switch (status) {
    case 'checked_in': return '📍';
    case 'in_progress': return '💇';
    case 'completed': return '✅';
    case 'cancelled': return '❌';
    case 'no_show': return '🚫';
    default: return '📅';
  }
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [newAppt, setNewAppt] = useState({
    customer_name: '', customer_phone: '', employee_name: '', service_name: '',
    date: TODAY, time: '09:00', duration: 60,
  });

  const loadAppointments = useCallback(async () => {
    try {
      const [apptRes, empRes, svcRes] = await Promise.all([
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_appointments', {}),
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_employees', {}),
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_services', {}),
      ]);
      const rows = apptRes?.data ?? [];
      const employees = empRes?.data ?? [];
      const employeeMap = new Map(
        employees.map((e) => [String(e.id ?? ''), String(e.name ?? '')]),
      );
      setEmployeeOptions(
        employees.map((e) => ({ id: String(e.id ?? ''), name: String(e.name ?? '') })),
      );
      if (rows.length > 0) {
        setAppointments(rows.map((r) => mapApiAppointment(r, employeeMap)));
      }
      const svcRows = svcRes?.data ?? [];
      if (svcRows.length > 0) {
        setServiceOptions(svcRows.map((s) => ({
          id: String(s.id ?? ''),
          name: String(s.name ?? ''),
          duration: Number(s.duration ?? 60),
        })));
      }
    } catch {
      /* keep mock in browser dev */
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const employeeNames = employeeOptions.length > 0
    ? employeeOptions.map((e) => e.name)
    : MOCK_EMPLOYEES;

  const serviceNames = serviceOptions.length > 0
    ? serviceOptions.map((s) => s.name)
    : FALLBACK_SERVICES;

  function handleServiceSelect(serviceName: string) {
    const svc = serviceOptions.find((s) => s.name === serviceName);
    setNewAppt((prev) => ({
      ...prev,
      service_name: serviceName,
      duration: svc?.duration ?? prev.duration,
    }));
  }

  const todayAppts = useMemo(() => {
    let result = appointments.filter((a) => a.start_at.startsWith(TODAY));
    if (filterEmployee !== 'all') result = result.filter((a) => a.employee_name === filterEmployee);
    // Sort by time
    result.sort((a, b) => a.start_at.localeCompare(b.start_at));
    return result;
  }, [appointments, filterEmployee]);

  const tabStatuses: Appointment['status'][] = ['pending', 'checked_in', 'in_progress', 'completed', 'cancelled'];

  const filteredAppts = tabValue === 0 ? todayAppts : appointments.filter((a) => a.status === tabStatuses[tabValue]);

  async function handleCreateAppointment() {
    const startAt = `${newAppt.date}T${newAppt.time}`;
    const employee = employeeOptions.find((e) => e.name === newAppt.employee_name);
    try {
      await safeInvoke('beauty_create_appointment', {
        customerId: newAppt.customer_phone || newAppt.customer_name,
        employeeId: employee?.id ?? newAppt.employee_name,
        serviceIds: [newAppt.service_name],
        startAt,
        duration: newAppt.duration,
      });
      await loadAppointments();
    } catch {
      const id = `a${Date.now()}`;
      setAppointments((prev) => [...prev, {
        id, customer_name: newAppt.customer_name, customer_phone: newAppt.customer_phone,
        employee_name: newAppt.employee_name, service_name: newAppt.service_name,
        start_at: startAt, duration: newAppt.duration, status: 'pending',
      }]);
    }
    setDialogOpen(false);
    setNewAppt({ customer_name: '', customer_phone: '', employee_name: '', service_name: '', date: TODAY, time: '09:00', duration: 60 });
  }

  async function handleUpdateStatus(apptId: string, newStatus: Appointment['status']) {
    try {
      await safeInvoke('beauty_update_appointment_status', { id: apptId, status: newStatus });
      await loadAppointments();
    } catch {
      setAppointments((prev) => prev.map((a) => a.id === apptId ? { ...a, status: newStatus } : a));
    }
  }

  const hours = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#fdf2f8' }}>
      {/* 顶部 */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>
          💇 预约管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} displayEmpty>
            <MenuItem value="all">全部技师</MenuItem>
            {employeeNames.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#ec4899' }} onClick={() => setDialogOpen(true)}>
          新建预约
        </Button>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 0 }} elevation={0}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`今日 (${todayAppts.length})`} />
          <Tab label="待服务" />
          <Tab label="已到店" />
          <Tab label="服务中" />
          <Tab label="已完成" />
          <Tab label="已取消" />
        </Tabs>
      </Paper>

      {/* 时间线视图（今日 tab） */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {tabValue === 0 ? (
          <Box sx={{ display: 'flex', gap: 0 }}>
            {/* 时间轴 */}
            <Box sx={{ minWidth: 60, pt: 6 }}>
              {hours.map((h) => (
                <Box key={h} sx={{ height: 72, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: '4px' }}>
                  <Typography variant="caption" color="text.secondary">{h}</Typography>
                </Box>
              ))}
            </Box>
            {/* 预约卡片 */}
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              {/* 时间网格线 */}
              {hours.map((h) => (
                <Box key={h} sx={{ height: 72, borderTop: '1px solid #e0e0e0', mx: 1 }} />
              ))}
              {/* 预约卡片 */}
              {todayAppts.map((appt) => {
                const d = new Date(appt.start_at);
                const topOffset = ((d.getHours() - 8) * 60 + d.getMinutes()) / 60 * 72;
                return (
                  <Paper
                    key={appt.id}
                    sx={{
                      position: 'absolute', top: topOffset, left: 8, right: 8,
                      p: 1.5, bgcolor: 'white',
                      border: `2px solid ${STATUS_CONFIG[appt.status].color}`,
                      borderRadius: 2, boxShadow: 1,
                      zIndex: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {getAppointmentEmoji(appt.status)} {appt.customer_name}
                      </Typography>
                      {getStatusChip(appt.status)}
                    </Box>
                    <Typography variant="caption" display="block" color="text.secondary">
                      <TimeIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      {formatTime(appt.start_at)} ({appt.duration}分钟)
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      <PersonIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      {appt.employee_name} · {appt.service_name}
                    </Typography>
                    {/* 操作按钮 */}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {appt.status === 'pending' && (
                        <>
                          <Button size="small" variant="contained" color="success" sx={{ fontSize: 11 }} onClick={() => handleUpdateStatus(appt.id, 'checked_in')}>到店</Button>
                          <Button size="small" variant="outlined" color="error" sx={{ fontSize: 11 }} onClick={() => handleUpdateStatus(appt.id, 'cancelled')}>取消</Button>
                          <Button size="small" variant="outlined" sx={{ fontSize: 11, color: '#9c27b0', borderColor: '#9c27b0' }} onClick={() => handleUpdateStatus(appt.id, 'no_show')}>未到</Button>
                        </>
                      )}
                      {appt.status === 'checked_in' && (
                        <Button size="small" variant="contained" color="warning" onClick={() => handleUpdateStatus(appt.id, 'in_progress')}>开始服务</Button>
                      )}
                      {appt.status === 'in_progress' && (
                        <Button size="small" variant="contained" color="success" onClick={() => handleUpdateStatus(appt.id, 'completed')}>完成</Button>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ) : (
          /* 列表视图（其他 tab） */
          <Grid container spacing={2}>
            {filteredAppts.map((appt) => (
              <Grid item xs={12} sm={6} md={4} key={appt.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">{appt.customer_name}</Typography>
                      {getStatusChip(appt.status)}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      <PersonIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      {appt.employee_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      服务：{appt.service_name} ({appt.duration}分钟)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      时间：{appt.start_at.replace('T', ' ')}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {appt.status === 'pending' && (
                      <>
                        <Button size="small" color="success" onClick={() => handleUpdateStatus(appt.id, 'checked_in')}>到店</Button>
                        <Button size="small" color="error" onClick={() => handleUpdateStatus(appt.id, 'cancelled')}>取消</Button>
                      </>
                    )}
                    {appt.status === 'checked_in' && (
                      <Button size="small" color="warning" onClick={() => handleUpdateStatus(appt.id, 'in_progress')}>开始服务</Button>
                    )}
                    {appt.status === 'in_progress' && (
                      <Button size="small" color="success" onClick={() => handleUpdateStatus(appt.id, 'completed')}>完成</Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* 新建预约对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ec4899', color: 'white' }}>📅 新建预约</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="客户姓名" value={newAppt.customer_name} onChange={(e) => setNewAppt({ ...newAppt, customer_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="联系电话" value={newAppt.customer_phone} onChange={(e) => setNewAppt({ ...newAppt, customer_phone: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>选择技师</InputLabel>
                <Select value={newAppt.employee_name} label="选择技师" onChange={(e) => setNewAppt({ ...newAppt, employee_name: e.target.value })}>
                  {employeeNames.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>服务项目</InputLabel>
                <Select value={newAppt.service_name} label="服务项目" onChange={(e) => handleServiceSelect(e.target.value)}>
                  {serviceNames.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="日期" type="date" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth label="时间" type="time" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth label="时长(分)" type="number" value={newAppt.duration} onChange={(e) => setNewAppt({ ...newAppt, duration: Number(e.target.value) })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#ec4899' }} onClick={handleCreateAppointment} disabled={!newAppt.customer_name || !newAppt.employee_name}>
            确认预约
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
