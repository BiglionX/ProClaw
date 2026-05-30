import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';

interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  duration: number;
  price: number;
  member_price: number;
  is_active: boolean;
  sort_order: number;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

const MOCK_CATEGORIES: ServiceCategory[] = [
  { id: 'sc1', name: '剪发', icon: '✂️' },
  { id: 'sc2', name: '染发', icon: '🎨' },
  { id: 'sc3', name: '烫发', icon: '🌀' },
  { id: 'sc4', name: '美容', icon: '💆' },
  { id: 'sc5', name: '美甲', icon: '💅' },
];

const MOCK_SERVICES: ServiceItem[] = [
  { id: 's1', category_id: 'sc1', name: '精剪', duration: 30, price: 68, member_price: 48, is_active: true, sort_order: 1 },
  { id: 's2', category_id: 'sc1', name: '洗剪吹', duration: 45, price: 88, member_price: 68, is_active: true, sort_order: 2 },
  { id: 's3', category_id: 'sc2', name: '全染', duration: 120, price: 298, member_price: 238, is_active: true, sort_order: 1 },
  { id: 's4', category_id: 'sc2', name: '挑染', duration: 90, price: 198, member_price: 158, is_active: true, sort_order: 2 },
  { id: 's5', category_id: 'sc3', name: '热烫', duration: 180, price: 398, member_price: 318, is_active: true, sort_order: 1 },
  { id: 's6', category_id: 'sc3', name: '冷烫', duration: 120, price: 268, member_price: 218, is_active: true, sort_order: 2 },
  { id: 's7', category_id: 'sc4', name: '基础面部护理', duration: 60, price: 168, member_price: 128, is_active: true, sort_order: 1 },
  { id: 's8', category_id: 'sc4', name: 'SPA套餐', duration: 90, price: 298, member_price: 238, is_active: true, sort_order: 2 },
  { id: 's9', category_id: 'sc5', name: '基础美甲', duration: 60, price: 98, member_price: 78, is_active: true, sort_order: 1 },
  { id: 's10', category_id: 'sc5', name: '美甲设计', duration: 90, price: 198, member_price: 158, is_active: true, sort_order: 2 },
];

const emptyService: ServiceItem = {
  id: '', category_id: '', name: '', duration: 60,
  price: 0, member_price: 0, is_active: true, sort_order: 0,
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>(MOCK_SERVICES);
  const [activeCategory, setActiveCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem>(emptyService);

  const filtered = activeCategory === 'all' ? services : services.filter((s) => s.category_id === activeCategory);

  function handleOpen(svc?: ServiceItem) {
    setEditing(svc || { ...emptyService, category_id: activeCategory !== 'all' ? activeCategory : '' });
    setDialogOpen(true);
  }

  function handleSave() {
    if (editing.id) {
      setServices((prev) => prev.map((s) => s.id === editing.id ? editing : s));
    } else {
      setServices((prev) => [...prev, { ...editing, id: `s${Date.now()}` }]);
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#fdf2f8' }}>
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>💇 服务项目</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip label="全部" variant={activeCategory === 'all' ? 'filled' : 'outlined'} color="secondary" onClick={() => setActiveCategory('all')} />
          {MOCK_CATEGORIES.map((cat) => (
            <Chip key={cat.id} label={`${cat.icon} ${cat.name}`} variant={activeCategory === cat.id ? 'filled' : 'outlined'} color="secondary" onClick={() => setActiveCategory(cat.id)} />
          ))}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#ec4899' }} onClick={() => handleOpen()}>新增项目</Button>
      </Paper>

      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {filtered.map((svc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={svc.id}>
              <Card sx={{ opacity: svc.is_active ? 1 : 0.6, border: '1px solid #ec489920' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">{svc.name}</Typography>
                    {!svc.is_active && <Chip label="已下架" size="small" />}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">{svc.duration}分钟</Typography>
                  </Box>
                  <Typography variant="h5" color="error" fontWeight="bold">
                    ¥{svc.price}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    会员价：¥{svc.member_price}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleOpen(svc)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(svc.id)}><DeleteIcon /></IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ec4899', color: 'white' }}>
          {editing.id ? '✏️ 编辑服务项目' : '➕ 新增服务项目'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="项目名称" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>所属分类</InputLabel>
                <Select value={editing.category_id} label="所属分类" onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                  {MOCK_CATEGORIES.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="时长(分钟)" type="number" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="标准价(元)" type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="会员价(元)" type="number" value={editing.member_price} onChange={(e) => setEditing({ ...editing, member_price: Number(e.target.value) })} />
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
