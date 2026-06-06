import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import { safeInvoke } from '../../lib/tauri';

export default function RecurringOrderPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { loadTemplates(); }, []);
  const loadTemplates = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('ff_get_recurring_templates'); if (r?.templates) setTemplates(r.templates); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const getScheduleLabel = (type: string, weekDays?: string) => {
    const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    if (type === 'daily') return '每日';
    if (type === 'weekly' && weekDays) return weekDays.split(',').map(d => days[parseInt(d)] || d).join('、');
    if (type === 'custom') return '自定义';
    return type;
  };

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0fdf4' }}><CircularProgress sx={{ color: '#16a34a' }} /></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#f0fdf4', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box><Typography variant="h5" fontWeight="bold" sx={{ color: '#16a34a' }}>周期订单</Typography><Typography variant="body2" color="text.secondary">共 {templates.length} 个模板</Typography></Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#f0fdf4' }}><TableCell>客户</TableCell><TableCell>配送周期</TableCell><TableCell>下次生成</TableCell><TableCell>状态</TableCell><TableCell>创建时间</TableCell></TableRow></TableHead>
          <TableBody>{templates.map((t: any) => (
            <TableRow key={t.id} hover><TableCell>{t.customer_name || t.customer_id}</TableCell><TableCell>{getScheduleLabel(t.schedule_type, t.week_days)}</TableCell><TableCell>{t.next_generate_date || '-'}</TableCell><TableCell><Chip label={t.is_active ? '启用' : '停用'} color={t.is_active ? 'success' : 'default'} size="small" /></TableCell><TableCell>{t.created_at?.substring(0, 19)}</TableCell></TableRow>
          ))}
          {templates.length === 0 && <TableRow><TableCell colSpan={5} align="center">暂无周期订单模板</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
    </Box>
  );
}
