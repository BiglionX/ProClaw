import {
  Delete as DeleteIcon,
  Image as ImageIcon,
  Movie as MovieIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
  CardActionArea,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Snackbar,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  addMediaAsset,
  addMediaCategory,
  deleteMediaAsset,
  deleteMediaCategory,
  fileToDataUrl,
  formatFileSize,
  getFileType,
  getMediaAssets,
  getMediaCategories,
  getMediaStats,
  updateMediaAsset,
  type MediaAsset,
  type MediaCategory,
} from '../lib/mediaLibraryService';

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0, totalSize: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'image' | 'video' | ''>('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setAssets(getMediaAssets({
      search: searchTerm || undefined,
      category_id: filterCategory || undefined,
      file_type: filterType || undefined,
    }));
    setCategories(getMediaCategories());
    setStats(getMediaStats());
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [searchTerm, filterCategory, filterType]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await fileToDataUrl(file);
      addMediaAsset({
        name: file.name,
        file_type: getFileType(file.type),
        data_url: dataUrl,
        mime_type: file.type,
        file_size: file.size,
        tags: [],
        linked_product_ids: [],
      });
    }
    loadData();
    showSnackbar(`已上传 ${files.length} 个文件`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个素材吗？')) {
      deleteMediaAsset(id);
      loadData();
      showSnackbar('素材已删除', 'success');
    }
  };

  const handleOpenDetail = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addMediaCategory(newCategoryName.trim());
    setNewCategoryName('');
    setNewCategoryDialog(false);
    loadData();
    showSnackbar('分类已添加', 'success');
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('确定要删除这个分类吗？（相关素材将变为未分类）')) {
      deleteMediaCategory(id);
      loadData();
      showSnackbar('分类已删除', 'success');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ message, severity });
  };

  const getCategoryName = (id?: string) => {
    if (!id) return '未分类';
    const cat = categories.find(c => c.id === id);
    return cat?.name || '未分类';
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          媒体库
        </Typography>
        <Typography variant="body1" color="text.secondary">
          统一的图片/视频资产管理中心，所有素材可跨平台复用
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">总素材</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">图片</Typography>
              <Typography variant="h4" color="primary.main">{stats.images}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">视频</Typography>
              <Typography variant="h4" color="secondary.main">{stats.videos}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">总大小</Typography>
              <Typography variant="h4">{formatFileSize(stats.totalSize)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 工具栏 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            上传素材
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={() => setNewCategoryDialog(true)}
          >
            新建分类
          </Button>
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={loadData}
          >
            刷新
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            placeholder="搜索素材..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ width: 200 }}
          />
          <ToggleButtonGroup
            size="small"
            value={filterType}
            exclusive
            onChange={(_, v) => setFilterType(v || '')}
          >
            <ToggleButton value="">全部</ToggleButton>
            <ToggleButton value="image"><ImageIcon sx={{ mr: 0.5 }} />图片</ToggleButton>
            <ToggleButton value="video"><MovieIcon sx={{ mr: 0.5 }} />视频</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* 分类标签 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label="全部"
          variant={filterCategory === '' ? 'filled' : 'outlined'}
          color={filterCategory === '' ? 'primary' : 'default'}
          onClick={() => setFilterCategory('')}
        />
        {categories.map(cat => (
          <Chip
            key={cat.id}
            label={cat.name}
            variant={filterCategory === cat.id ? 'filled' : 'outlined'}
            color={filterCategory === cat.id ? 'primary' : 'default'}
            onClick={() => setFilterCategory(cat.id)}
            onDelete={() => handleDeleteCategory(cat.id)}
          />
        ))}
      </Box>

      {/* 素材网格 */}
      {assets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ImageIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            暂无素材
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            拖拽图片或视频到此处，或点击上方"上传素材"按钮
          </Typography>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
            选择文件上传
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {assets.map(asset => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={asset.id}>
              <Card sx={{ position: 'relative', '&:hover .delete-btn': { opacity: 1 } }}>
                <CardActionArea onClick={() => handleOpenDetail(asset)}>
                  {asset.file_type === 'video' ? (
                    <Box
                      sx={{
                        height: 140,
                        bgcolor: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MovieIcon sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                  ) : (
                    <CardMedia
                      component="img"
                      height="140"
                      image={asset.data_url || asset.thumbnail_data_url}
                      alt={asset.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                </CardActionArea>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" noWrap title={asset.name}>
                    {asset.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(asset.file_size)}
                    </Typography>
                    <Chip label={getCategoryName(asset.category_id)} size="small" variant="outlined" />
                  </Box>
                </Box>
                <IconButton
                  className="delete-btn"
                  size="small"
                  sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity 0.2s', bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                  onClick={() => handleDelete(asset.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 素材详情弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedAsset && (
          <>
            <DialogTitle>素材详情</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, mt: 2 }}>
                <Box sx={{ flex: 1, maxWidth: 400 }}>
                  {selectedAsset.file_type === 'video' ? (
                    <Box sx={{ bgcolor: '#000', p: 4, textAlign: 'center', borderRadius: 1 }}>
                      <MovieIcon sx={{ fontSize: 64, color: 'white' }} />
                    </Box>
                  ) : (
                    <img
                      src={selectedAsset.data_url || selectedAsset.thumbnail_data_url}
                      alt={selectedAsset.name}
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField label="文件名" fullWidth size="small" value={selectedAsset.name} sx={{ mb: 2 }} />
                  <TextField label="类型" fullWidth size="small" value={selectedAsset.mime_type} sx={{ mb: 2 }} />
                  <TextField label="大小" fullWidth size="small" value={formatFileSize(selectedAsset.file_size)} sx={{ mb: 2 }} />
                  <TextField
                    label="分类"
                    select
                    fullWidth
                    size="small"
                    value={selectedAsset.category_id || ''}
                    onChange={(e) => {
                      updateMediaAsset(selectedAsset.id, { category_id: e.target.value || undefined });
                      loadData();
                    }}
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="">未分类</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="标签（逗号分隔）"
                    fullWidth
                    size="small"
                    value={selectedAsset.tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      updateMediaAsset(selectedAsset.id, { tags });
                      loadData();
                    }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="替代文本"
                    fullWidth
                    size="small"
                    value={selectedAsset.alt_text || ''}
                    onChange={(e) => {
                      updateMediaAsset(selectedAsset.id, { alt_text: e.target.value });
                    }}
                  />
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 新建分类对话框 */}
      <Dialog open={newCategoryDialog} onClose={() => setNewCategoryDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新建分类</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="分类名称"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="例如：商品图、海报素材、短视频"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>取消</Button>
          <Button onClick={handleAddCategory} variant="contained" disabled={!newCategoryName.trim()}>
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}


