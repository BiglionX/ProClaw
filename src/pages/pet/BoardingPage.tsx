import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Divider,
} from '@mui/material';
import {
  CheckCircle as CheckInIcon,
  Logout as CheckOutIcon,
  Pets as PetsIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

function mapApiBoarding(row: Record<string, unknown>): BoardingRecord {
  return {
    id: String(row.id ?? ''),
    pet_name: String(row.pet_id ?? ''),
    owner_name: '',
    room_name: String(row.room_id ?? ''),
    check_in_at: String(row.check_in_at ?? ''),
    check_out_at: String(row.check_out_at ?? ''),
    daily_rate: Number(row.daily_rate ?? 0),
    total_amount: row.total_amount == null ? null : Number(row.total_amount),
    status: (row.status as BoardingRecord['status']) ?? 'active',
    notes: String(row.notes ?? ''),
  };
}

interface BoardingRecord {
  id: string;
  pet_name: string;
  owner_name: string;
  room_name: string;
  check_in_at: string;
  check_out_at: string;
  daily_rate: number;
  total_amount: number | null;
  status: 'active' | 'checked_out' | 'cancelled';
  notes: string;
}

interface BoardingRoom {
  id: string;
  name: string;
  room_type: string;
  capacity: number;
  daily_rate: number;
  status: 'vacant' | 'occupied' | 'cleaning' | 'maintenance';
}

const MOCK_ROOMS: BoardingRoom[] = [
  { id: 'r1', name: '标准间 A1', room_type: 'standard', capacity: 1, daily_rate: 80, status: 'occupied' },
  { id: 'r2', name: '标准间 A2', room_type: 'standard', capacity: 1, daily_rate: 80, status: 'vacant' },
  { id: 'r3', name: '豪华间 B1', room_type: 'luxury', capacity: 2, daily_rate: 150, status: 'vacant' },
  { id: 'r4', name: '豪华间 B2', room_type: 'luxury', capacity: 2, daily_rate: 150, status: 'occupied' },
  { id: 'r5', name: '豪华间 B3', room_type: 'luxury', capacity: 2, daily_rate: 150, status: 'occupied' },
  { id: 'r6', name: 'VIP 房间 C1', room_type: 'vip', capacity: 3, daily_rate: 280, status: 'vacant' },
  { id: 'r7', name: 'VIP 房间 C2', room_type: 'vip', capacity: 3, daily_rate: 280, status: 'cleaning' },
  { id: 'r8', name: '标准间 A3', room_type: 'standard', capacity: 1, daily_rate: 80, status: 'vacant' },
  { id: 'r9', name: '猫房专区 M1', room_type: 'cat', capacity: 1, daily_rate: 60, status: 'vacant' },
  { id: 'r10', name: '猫房专区 M2', room_type: 'cat', capacity: 1, daily_rate: 60, status: 'occupied' },
];

const MOCK_BOARDINGS: BoardingRecord[] = [
  { id: 'b1', pet_name: '小黄', owner_name: '张三', room_name: '标准间 A1', check_in_at: '2026-05-25', check_out_at: '2026-05-30', daily_rate: 80, total_amount: null, status: 'active', notes: '每日需喂药' },
  { id: 'b2', pet_name: '咪咪', owner_name: '李四', room_name: '豪华间 B2', check_in_at: '2026-05-26', check_out_at: '2026-06-02', daily_rate: 150, total_amount: null, status: 'active', notes: '' },
  { id: 'b3', pet_name: '小黑', owner_name: '王五', room_name: '豪华间 B3', check_in_at: '2026-05-20', check_out_at: '2026-05-27', daily_rate: 150, total_amount: 1050, status: 'checked_out', notes: '' },
];

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: '标准间', luxury: '豪华间', vip: 'VIP', cat: '猫房',
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  standard: '#2196f3', luxury: '#9c27b0', vip: '#ff9800', cat: '#4caf50',
};

function RoomStatusChip({ status }: { status: BoardingRoom['status'] }) {
  const config: Record<string, { label: string; color: string }> = {
    vacant: { label: '空闲', color: '#4caf50' },
    occupied: { label: '已占用', color: '#f44336' },
    cleaning: { label: '清洁中', color: '#9e9e9e' },
    maintenance: { label: '维护中', color: '#ff9800' },
  };
  const c = config[status];
  return <Chip label={c.label} size="small" sx={{ color: 'white', bgcolor: c.color }} />;
}

export default function BoardingPage() {
  const [boardings, setBoardings] = useState<BoardingRecord[]>(MOCK_BOARDINGS);
  const [rooms, setRooms] = useState<BoardingRoom[]>(MOCK_ROOMS);
  const [tabValue, setTabValue] = useState(0);
  const [checkInDialog, setCheckInDialog] = useState(false);
  const [checkOutDialog, setCheckOutDialog] = useState<BoardingRecord | null>(null);
  const [newBoarding, setNewBoarding] = useState({
    pet_name: '', owner_name: '', room_id: '', daily_rate: 80,
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  const activeBoardings = boardings.filter((b) => b.status === 'active');
  const historyBoardings = boardings.filter((b) => b.status !== 'active');

  const vacantRooms = rooms.filter((r) => r.status === 'vacant');

  const loadBoardings = useCallback(async () => {
    try {
      const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>('pet_get_boarding_records', {});
      const rows = res?.data ?? [];
      if (rows.length > 0) {
        setBoardings(rows.map(mapApiBoarding));
      }
    } catch {
      /* keep mock in browser dev */
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>('pet_get_boarding_rooms', {});
      const rows = res?.data ?? [];
      if (rows.length > 0) {
        setRooms(rows.map((row) => ({
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          room_type: String(row.room_type ?? 'standard'),
          capacity: Number(row.capacity ?? 1),
          daily_rate: Number(row.daily_rate ?? 0),
          status: (String(row.status ?? 'vacant') as BoardingRoom['status']),
        })));
      }
    } catch {
      /* keep mock in browser dev */
    }
  }, []);

  useEffect(() => {
    loadBoardings();
    loadRooms();
  }, [loadBoardings, loadRooms]);

  async function handleCheckIn() {
    const room = rooms.find((r) => r.id === newBoarding.room_id);
    if (!room) return;
    try {
      await safeInvoke('pet_create_boarding', {
        petId: newBoarding.pet_name,
        roomId: newBoarding.room_id,
        checkIn: newBoarding.check_in,
        checkOut: newBoarding.check_out,
        dailyRate: room.daily_rate,
      });
      await loadBoardings();
      await loadRooms();
    } catch {
      const id = `b${Date.now()}`;
      setBoardings((prev) => [...prev, {
        id, pet_name: newBoarding.pet_name, owner_name: newBoarding.owner_name,
        room_name: room.name, check_in_at: newBoarding.check_in,
        check_out_at: newBoarding.check_out, daily_rate: room.daily_rate,
        total_amount: null, status: 'active', notes: '',
      }]);
      setRooms((prev) => prev.map((r) => r.id === newBoarding.room_id ? { ...r, status: 'occupied' as const } : r));
    }
    setCheckInDialog(false);
    setNewBoarding({ pet_name: '', owner_name: '', room_id: '', daily_rate: 80, check_in: '', check_out: '' });
  }

  async function handleCheckOut(boarding: BoardingRecord) {
    const days = Math.ceil((new Date(boarding.check_out_at).getTime() - new Date(boarding.check_in_at).getTime()) / 86400000);
    const amount = days * boarding.daily_rate;
    try {
      await safeInvoke('pet_check_out_boarding', { boardingId: boarding.id, finalAmount: amount });
      await loadBoardings();
      await loadRooms();
    } catch {
      setBoardings((prev) => prev.map((b) => b.id === boarding.id ? { ...b, status: 'checked_out' as const, total_amount: amount } : b));
    }
    setCheckOutDialog(null);
  }

  const roomTypes = [...new Set(rooms.map((r) => r.room_type))];

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* 顶部 */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
          🏠 寄养管理
        </Typography>
        <Chip label={`在住 ${activeBoardings.length}`} color="warning" />
        <Chip label={`空闲 ${vacantRooms.length}`} color="success" />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<CheckInIcon />} sx={{ bgcolor: '#f59e0b' }} onClick={() => setCheckInDialog(true)}>
          入住办理
        </Button>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 0 }} elevation={0}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`在住 (${activeBoardings.length})`} />
          <Tab label={`历史 (${historyBoardings.length})`} />
          <Tab label="房间管理" />
        </Tabs>
      </Paper>

      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {/* 在住列表 */}
        {tabValue === 0 && (
          <Grid container spacing={2}>
            {activeBoardings.map((b) => (
              <Grid item xs={12} sm={6} md={4} key={b.id}>
                <Card sx={{ border: '2px solid #f59e0b40' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        <PetsIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} />{b.pet_name}
                      </Typography>
                      <Chip label="在住" color="warning" size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      主人：{b.owner_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      房间：{b.room_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      入住：{b.check_in_at} ~ {b.check_out_at}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      费用：¥{b.daily_rate}/天
                    </Typography>
                    <Typography variant="caption" display="block" color="error" sx={{ mt: 0.5 }}>
                      {b.notes}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button fullWidth variant="outlined" color="warning" startIcon={<CheckOutIcon />} onClick={() => setCheckOutDialog(b)}>
                      离店结算
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {activeBoardings.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  暂无在住宠物
                </Typography>
              </Grid>
            )}
          </Grid>
        )}

        {/* 历史记录 */}
        {tabValue === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>宠物</TableCell><TableCell>主人</TableCell><TableCell>房间</TableCell>
                  <TableCell>入住</TableCell><TableCell>离店</TableCell><TableCell>总金额</TableCell><TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyBoardings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.pet_name}</TableCell>
                    <TableCell>{b.owner_name}</TableCell>
                    <TableCell>{b.room_name}</TableCell>
                    <TableCell>{b.check_in_at}</TableCell>
                    <TableCell>{b.check_out_at}</TableCell>
                    <TableCell>¥{b.total_amount?.toFixed(2) || '-'}</TableCell>
                    <TableCell><Chip label={b.status === 'checked_out' ? '已离店' : '已取消'} size="small" color="default" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 房间管理 */}
        {tabValue === 2 && (
          <Box>
            {roomTypes.map((type) => (
              <Box key={type} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: ROOM_TYPE_COLORS[type] }}>
                  {ROOM_TYPE_LABELS[type] || type} ({rooms.filter((r) => r.room_type === type).length})
                </Typography>
                <Grid container spacing={1.5}>
                  {rooms.filter((r) => r.room_type === type).map((room) => (
                    <Grid item key={room.id}>
                      <Paper
                        sx={{
                          p: 2, textAlign: 'center', minWidth: 120,
                          border: `2px solid ${room.status === 'vacant' ? '#4caf50' : room.status === 'occupied' ? '#f44336' : '#9e9e9e'}`,
                        }}
                      >
                        <Typography variant="body1" fontWeight="bold">{room.name}</Typography>
                        <RoomStatusChip status={room.status} />
                        <Typography variant="caption" display="block">最多 {room.capacity} 只</Typography>
                        <Typography variant="caption" display="block">¥{room.daily_rate}/天</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 入住对话框 */}
      <Dialog open={checkInDialog} onClose={() => setCheckInDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f59e0b', color: 'white' }}>🐾 入住办理</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="宠物名称" value={newBoarding.pet_name} onChange={(e) => setNewBoarding({ ...newBoarding, pet_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="主人姓名" value={newBoarding.owner_name} onChange={(e) => setNewBoarding({ ...newBoarding, owner_name: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>选择房间</InputLabel>
                <Select value={newBoarding.room_id} label="选择房间" onChange={(e) => {
                  const room = rooms.find((r) => r.id === e.target.value);
                  setNewBoarding({ ...newBoarding, room_id: e.target.value, daily_rate: room?.daily_rate || 80 });
                }}>
                  {vacantRooms.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name} - {ROOM_TYPE_LABELS[r.room_type]} (¥{r.daily_rate}/天, 最多{r.capacity}只)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="入住日期" type="date" value={newBoarding.check_in} onChange={(e) => setNewBoarding({ ...newBoarding, check_in: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="预计离店" type="date" value={newBoarding.check_out} onChange={(e) => setNewBoarding({ ...newBoarding, check_out: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="每日费用" type="number" value={newBoarding.daily_rate} disabled />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckInDialog(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#f59e0b' }} onClick={handleCheckIn} disabled={!newBoarding.pet_name || !newBoarding.room_id}>
            确认入住
          </Button>
        </DialogActions>
      </Dialog>

      {/* 离店结算对话框 */}
      <Dialog open={!!checkOutDialog} onClose={() => setCheckOutDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f59e0b', color: 'white' }}>📋 离店结算</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {checkOutDialog && (
            <Box>
              <Typography variant="body1"><strong>宠物：</strong>{checkOutDialog.pet_name}</Typography>
              <Typography variant="body1"><strong>房间：</strong>{checkOutDialog.room_name}</Typography>
              <Typography variant="body1"><strong>入住：</strong>{checkOutDialog.check_in_at} ~ {checkOutDialog.check_out_at}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">
                <strong>费用明细：</strong>{checkOutDialog.daily_rate}/天
              </Typography>
              <Typography variant="h5" color="warning.main" fontWeight="bold" sx={{ mt: 1 }}>
                预估总额：¥{Math.ceil((new Date(checkOutDialog.check_out_at).getTime() - new Date(checkOutDialog.check_in_at).getTime()) / 86400000) * checkOutDialog.daily_rate}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckOutDialog(null)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#f59e0b' }} onClick={() => checkOutDialog && handleCheckOut(checkOutDialog)}>
            确认结算离店
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
