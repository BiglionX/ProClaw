import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Avatar, IconButton,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon,
  Delete as DeleteIcon, Cake as CakeIcon, MonitorWeight as WeightIcon,
} from '@mui/icons-material';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  birth_date: string;
  weight: number;
  color: string;
  chip_no: string;
  owner_name: string;
  owner_phone: string;
  is_neutered: boolean;
  notes: string;
}

const MOCK_PETS: Pet[] = [
  { id: 'p1', name: '小黄', species: 'dog', breed: '金毛', gender: 'male', birth_date: '2023-06-15', weight: 28.5, color: '金色', chip_no: 'CN985632147', owner_name: '张三', owner_phone: '13800138001', is_neutered: true, notes: '性格温和' },
  { id: 'p2', name: '咪咪', species: 'cat', breed: '布偶', gender: 'female', birth_date: '2024-01-20', weight: 4.2, color: '白色', chip_no: '', owner_name: '李四', owner_phone: '13800138002', is_neutered: false, notes: '胆小' },
  { id: 'p3', name: '小黑', species: 'dog', breed: '泰迪', gender: 'male', birth_date: '2022-11-08', weight: 6.0, color: '黑色', chip_no: 'CN123456789', owner_name: '王五', owner_phone: '13800138003', is_neutered: true, notes: '' },
  { id: 'p4', name: '小白', species: 'cat', breed: '英短', gender: 'male', birth_date: '2024-05-01', weight: 3.8, color: '灰色', chip_no: '', owner_name: '张三', owner_phone: '13800138001', is_neutered: false, notes: '活泼' },
  { id: 'p5', name: '豆豆', species: 'dog', breed: '柯基', gender: 'female', birth_date: '2023-09-12', weight: 12.0, color: '黄白', chip_no: '', owner_name: '赵六', owner_phone: '13800138004', is_neutered: true, notes: '疫苗已打' },
];

const SPECIES_OPTIONS = [
  { value: 'dog', label: '🐕 狗' },
  { value: 'cat', label: '🐈 猫' },
  { value: 'other', label: '🐹 其他' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: '♂ 雄性' },
  { value: 'female', label: '♀ 雌性' },
];

function PetAvatar({ species }: { species: string }) {
  const emoji = species === 'dog' ? '🐕' : species === 'cat' ? '🐈' : '🐹';
  return (
    <Avatar sx={{ bgcolor: '#f59e0b', width: 64, height: 64, fontSize: 32 }}>
      {emoji}
    </Avatar>
  );
}

const emptyPet: Pet = {
  id: '', name: '', species: 'dog', breed: '', gender: 'male',
  birth_date: '', weight: 0, color: '', chip_no: '',
  owner_name: '', owner_phone: '', is_neutered: false, notes: '',
};

export default function PetProfilesPage() {
  const [pets, setPets] = useState<Pet[]>(MOCK_PETS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet>(emptyPet);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPets = useMemo(() => {
    let result = pets;
    if (speciesFilter !== 'all') result = result.filter((p) => p.species === speciesFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.owner_name.includes(q) || p.breed.includes(q));
    }
    return result;
  }, [pets, speciesFilter, searchQuery]);

  function handleOpenDialog(pet?: Pet) {
    setEditingPet(pet || emptyPet);
    setDialogOpen(true);
  }

  function handleSave() {
    if (editingPet.id) {
      setPets((prev) => prev.map((p) => p.id === editingPet.id ? editingPet : p));
    } else {
      setPets((prev) => [...prev, { ...editingPet, id: `p${Date.now()}` }]);
    }
    setDialogOpen(false);
  }

  function handleDelete(petId: string) {
    setPets((prev) => prev.filter((p) => p.id !== petId));
  }

  function calculateAge(birthDate: string): string {
    if (!birthDate) return '未知';
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years}岁${months}个月`;
    return `${months}个月`;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* 顶部 */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
          🐾 宠物档案
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} displayEmpty>
            <MenuItem value="all">全部 ({pets.length})</MenuItem>
            <MenuItem value="dog">🐕 狗 ({pets.filter(p => p.species === 'dog').length})</MenuItem>
            <MenuItem value="cat">🐈 猫 ({pets.filter(p => p.species === 'cat').length})</MenuItem>
            <MenuItem value="other">🐹 其他</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" placeholder="搜索宠物/主人..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ minWidth: 200 }} />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#f59e0b' }} onClick={() => handleOpenDialog()}>
          新增宠物
        </Button>
      </Paper>

      {/* 内容 */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {filteredPets.map((pet) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={pet.id}>
              <Card sx={{ '&:hover': { boxShadow: 4 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <PetAvatar species={pet.species} />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{pet.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pet.breed} · {pet.gender === 'male' ? '♂' : '♀'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={pet.species === 'dog' ? '狗' : pet.species === 'cat' ? '猫' : '其他'} size="small" color="warning" variant="outlined" />
                        {pet.is_neutered && <Chip label="已绝育" size="small" color="success" variant="outlined" />}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CakeIcon fontSize="small" color="action" />
                      <Typography variant="body2">{calculateAge(pet.birth_date)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WeightIcon fontSize="small" color="action" />
                      <Typography variant="body2">{pet.weight} kg</Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">主人：{pet.owner_name}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">电话：{pet.owner_phone}</Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleOpenDialog(pet)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(pet.id)}><DeleteIcon /></IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f59e0b', color: 'white' }}>
          {editingPet.id ? '✏️ 编辑宠物档案' : '🐾 新增宠物档案'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="宠物名称" value={editingPet.name} onChange={(e) => setEditingPet({ ...editingPet, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>物种</InputLabel>
                <Select value={editingPet.species} label="物种" onChange={(e) => setEditingPet({ ...editingPet, species: e.target.value })}>
                  {SPECIES_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="品种" value={editingPet.breed} onChange={(e) => setEditingPet({ ...editingPet, breed: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>性别</InputLabel>
                <Select value={editingPet.gender} label="性别" onChange={(e) => setEditingPet({ ...editingPet, gender: e.target.value })}>
                  {GENDER_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="出生日期" type="date" value={editingPet.birth_date} onChange={(e) => setEditingPet({ ...editingPet, birth_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="体重 (kg)" type="number" value={editingPet.weight} onChange={(e) => setEditingPet({ ...editingPet, weight: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="毛色" value={editingPet.color} onChange={(e) => setEditingPet({ ...editingPet, color: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="芯片号" value={editingPet.chip_no} onChange={(e) => setEditingPet({ ...editingPet, chip_no: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="主人姓名" value={editingPet.owner_name} onChange={(e) => setEditingPet({ ...editingPet, owner_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="主人电话" value={editingPet.owner_phone} onChange={(e) => setEditingPet({ ...editingPet, owner_phone: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="备注" multiline rows={2} value={editingPet.notes} onChange={(e) => setEditingPet({ ...editingPet, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: '#f59e0b' }} onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Divider() {
  return <Box sx={{ height: 1, bgcolor: '#e0e0e0', my: 1 }} />;
}
