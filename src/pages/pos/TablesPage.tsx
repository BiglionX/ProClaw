import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  MeetingRoom as RoomIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface PosTable {
  id: string;
  area: string;
  name: string;
  capacity: number;
  status: 'vacant' | 'occupied' | 'reserved' | 'cleaning';
}

const MOCK_TABLES: PosTable[] = [
  { id: 't1', area: '大厅', name: 'A1', capacity: 4, status: 'vacant' },
  { id: 't2', area: '大厅', name: 'A2', capacity: 4, status: 'occupied' },
  { id: 't3', area: '大厅', name: 'A3', capacity: 6, status: 'occupied' },
  { id: 't4', area: '大厅', name: 'A5', capacity: 8, status: 'reserved' },
  { id: 't5', area: '包间', name: 'V1', capacity: 10, status: 'vacant' },
  { id: 't6', area: '包间', name: 'V2', capacity: 12, status: 'vacant' },
  { id: 't7', area: '包间', name: 'V3', capacity: 8, status: 'cleaning' },
  { id: 't8', area: '包间', name: 'V5', capacity: 16, status: 'occupied' },
  { id: 't9', area: '大厅', name: 'A6', capacity: 4, status: 'vacant' },
  { id: 't10', area: '大厅', name: 'A7', capacity: 4, status: 'vacant' },
  { id: 't11', area: '大厅', name: 'A8', capacity: 6, status: 'vacant' },
  { id: 't12', area: '包间', name: 'V6', capacity: 20, status: 'vacant' },
];

const STATUS_CONFIG: Record<PosTable['status'], { label: string; color: string }> = {
  vacant: { label: '空闲', color: '#4caf50' },
  occupied: { label: '已占用', color: '#f44336' },
  reserved: { label: '已预订', color: '#ff9800' },
  cleaning: { label: '清洁中', color: '#9e9e9e' },
};

function TableStatusChip({ status }: { status: PosTable['status'] }) {
  const config = STATUS_CONFIG[status];
  return <Chip label={config.label} size="small" sx={{ color: 'white', bgcolor: config.color, fontWeight: 'bold' }} />;
}

export default function TablesPage() {
  const [tables, setTables] = useState<PosTable[]>(MOCK_TABLES);
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterArea, setFilterArea] = useState<string>('all');

  const loadTables = useCallback(async () => {
    try {
      const res = await safeInvoke<{ data?: Array<Record<string, unknown>> }>('catering_get_tables', {});
      const rows = res?.data ?? [];
      if (rows.length > 0) {
        setTables(rows.map((row) => ({
          id: String(row.id ?? ''),
          area: String(row.area ?? ''),
          name: String(row.name ?? ''),
          capacity: Number(row.capacity ?? 0),
          status: (String(row.status ?? 'vacant') as PosTable['status']),
        })));
      }
    } catch {
      /* keep mock in browser dev */
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const groupedByArea = useMemo(() => {
    const groups: Record<string, PosTable[]> = {};
    const filtered = filterArea === 'all' ? tables : tables.filter((t) => t.area === filterArea);
    filtered.forEach((t) => {
      if (!groups[t.area]) groups[t.area] = [];
      groups[t.area].push(t);
    });
    return groups;
  }, [tables, filterArea]);

  const areas = useMemo(() => [...new Set(tables.map((t) => t.area))], [tables]);
  const stats = useMemo(() => ({
    total: tables.length,
    vacant: tables.filter((t) => t.status === 'vacant').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }), [tables]);

  function handleTableClick(table: PosTable) {
    setSelectedTable(table);
    setDialogOpen(true);
  }

  async function handleChangeStatus(tableId: string, newStatus: PosTable['status']) {
    try {
      await safeInvoke('catering_update_table_status', { tableId, status: newStatus });
      await loadTables();
    } catch {
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t)));
    }
    setDialogOpen(false);
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* 顶栏 */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#e74c3c' }}>
          🪑 桌台管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
          <Chip label={`总计 ${stats.total}`} variant="outlined" />
          <Chip label={`空闲 ${stats.vacant}`} sx={{ bgcolor: '#4caf50', color: 'white' }} />
          <Chip label={`占用 ${stats.occupied}`} sx={{ bgcolor: '#f44336', color: 'white' }} />
          <Chip label={`预订 ${stats.reserved}`} sx={{ bgcolor: '#ff9800', color: 'white' }} />
          <Chip label={`清洁 ${stats.cleaning}`} sx={{ bgcolor: '#9e9e9e', color: 'white' }} />
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>区域</InputLabel>
          <Select value={filterArea} label="区域" onChange={(e) => setFilterArea(e.target.value)}>
            <MenuItem value="all">全部</MenuItem>
            {areas.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="grid"><GridViewIcon /></ToggleButton>
          <ToggleButton value="list"><ListViewIcon /></ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* 内容 */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {viewMode === 'grid' ? (
          Object.entries(groupedByArea).map(([area, areaTables]) => (
            <Box key={area} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <RoomIcon /> {area}
              </Typography>
              <Grid container spacing={2}>
                {areaTables.map((table) => {
                  const config = STATUS_CONFIG[table.status];
                  return (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={table.id}>
                      <Paper
                        sx={{
                          p: 2, textAlign: 'center', cursor: 'pointer',
                          border: `2px solid ${config.color}`,
                          bgcolor: config.color + '08',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                        }}
                        onClick={() => handleTableClick(table)}
                      >
                        <Typography variant="h4" fontWeight="bold">{table.name}</Typography>
                        <TableStatusChip status={table.status} />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          {table.capacity} 位
                        </Typography>
                        {table.status === 'occupied' && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            已开台
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>桌台</TableCell>
                  <TableCell>区域</TableCell>
                  <TableCell>容量</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleTableClick(table)}>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">{table.name}</Typography>
                    </TableCell>
                    <TableCell>{table.area}</TableCell>
                    <TableCell>{table.capacity} 位</TableCell>
                    <TableCell><TableStatusChip status={table.status} /></TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleTableClick(table); }}>
                        操作
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 操作对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e74c3c', color: 'white' }}>
          🪑 桌台操作 - {selectedTable?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedTable && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h3" fontWeight="bold">{selectedTable.name}</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {selectedTable.area} · {selectedTable.capacity} 位
              </Typography>
              <TableStatusChip status={selectedTable.status} />
            </Box>
          )}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>变更状态：</Typography>
          <Grid container spacing={1}>
            {(['vacant', 'occupied', 'reserved', 'cleaning'] as const).map((status) => (
              <Grid item xs={6} key={status}>
                <Button
                  fullWidth
                  variant={selectedTable?.status === status ? 'contained' : 'outlined'}
                  sx={{
                    py: 1.5,
                    bgcolor: selectedTable?.status === status ? STATUS_CONFIG[status].color : undefined,
                    borderColor: STATUS_CONFIG[status].color,
                    color: selectedTable?.status === status ? 'white' : STATUS_CONFIG[status].color,
                    '&:hover': { bgcolor: STATUS_CONFIG[status].color + '20' },
                  }}
                  onClick={() => selectedTable && handleChangeStatus(selectedTable.id, status)}
                >
                  {STATUS_CONFIG[status].label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
