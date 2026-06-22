import { useState, useEffect, useCallback } from 'react';
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
import { safeInvoke } from '../../lib/tauri';

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

const FALLBACK_CATEGORIES: ServiceCategory[] = [
  { id: 'sc1', name: '剪发', icon: '✂️' },
  { id: 'sc2', name: '染发', icon: '🎨' },
  { id: 'sc3', name: '烫发', icon: '🌀' },
  { id: 'sc4', name: '美容', icon: '💆' },
  { id: 'sc5', name: '美甲', icon: '💅' },
];

const FALLBACK_SERVICES: ServiceItem[] = [
  { id: 's1', category_id: 'sc1', name: '精剪', duration: 30, price: 68, member_price: 48, is_active: true, sort_order: 1 },
  { id: 's2', category_id: 'sc1', name: '洗剪吹', duration: 45, price: 88, member_price: 68, is_active: true, sort_order: 2 },
  { id: 's3', category_id: 'sc2', name: '全染', duration: 120, price: 298, member_price: 238, is_active: true, sort_order: 1 },
];

const emptyService: ServiceItem = {
  id: '', category_id: '', name: '', duration: 60,
  price: 0, member_price: 0, is_active: true, sort_order: 0,
};

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>(FALLBACK_CATEGORIES);
  const [services, setServices] = useState<ServiceItem[]>(FALLBACK_SERVICES);
  const [activeCategory, setActiveCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem>(emptyService);

  const loadCatalog = useCallback(async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_service_categories', {}),
        safeInvoke<{ data?: Array<Record<string, unknown>> }>('beauty_get_services', {}),
      ]);
      const catRows = catRes?.data ?? [];
      if (catRows.length > 0) {
        setCategories(catRows.map((c) => ({
          id: String(c.id ?? ''),
          name: String(c.name ?? ''),
          icon: String(c.icon ?? ''),
        })));
      }
      const svcRows = svcRes?.data ?? [];
      if (svcRows.length > 0) {
        setServices(svcRows.map((s) => ({
          id: String(s.id ?? ''),
          category_id: String(s.category_id ?? ''),
          name: String(s.name ?? ''),
          duration: Number(s.duration ?? 60),
          price: Number(s.price ?? 0),
          member_price: Number(s.member_price ?? 0),
          is_active: s.is_active !== false,
          sort_order: Number(s.sort_order ?? 0),
        })));
      }
    } catch {
      /* keep fallback in browser dev */
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filtered = activeCategory === 'all'
    ? services
    : services.filter((s) => s.category_id === activeCategory);

  function handleOpen(svc?: ServiceItem) {
    setEditing(svc || { ...emptyService, category_id: activeCategory !== 'all' ? activeCategory : '' });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing.id) {
        await safeInvoke('beauty_update_service', {
          id: editing.id,
          categoryId: editing.category_id,
          name: editing.name,
          duration: editing.duration,
          price: editing.price,
          memberPrice: editing.member_price,
          isActive: editing.is_active,
        });
      } else {
        await safeInvoke('beauty_create_service', {
          categoryId: editing.category_id,
          name: editing.name,
          duration: editing.duration,
          price: editing.price,
          memberPrice: editing.member_price || undefined,
        });
      }
      await loadCatalog();
    } catch {
      if (editing.id) {
        setServices((prev) => prev.map((s) => s.id === editing.id ? editing : s));
      } else {
        setServices((prev) => [...prev, { ...editing, id: `s${Date.now()}` }]);
      }
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    try {
      await safeInvoke('beauty_delete_service', { id });
      await loadCatalog();
    } catch {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#fdf2f8' }}>
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>💇 服务项目</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label="全部" variant={activeCategory === 'all' ? 'filled' : 'outlined'} color="secondary" onClick={() => setActiveCategory('all')} />
          {categories.map((cat) => (
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
                  <Typography variant="h6" fontWeight="bold">{svc.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">{svc.duration} 分钟</Typography>
                  </Box>
                  <Typography variant="h5" color="secondary" fontWeight="bold" sx={{ mt: 1 }}>
                    ¥{svc.price}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      会员 ¥{svc.member_price}
                    </Typography>
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
        <DialogTitle>{editing.id ? '编辑项目' : '新增项目'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>分类</InputLabel>
            <Select value={editing.category_id} label="分类" onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
              {categories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="项目名称" fullWidth value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <TextField label="时长（分钟）" type="number" fullWidth value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })} />
          <TextField label="标准价" type="number" fullWidth value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
          <TextField label="会员价" type="number" fullWidth value={editing.member_price} onChange={(e) => setEditing({ ...editing, member_price: Number(e.target.value) })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#ec4899' }} onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
