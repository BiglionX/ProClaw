import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  createQAPair,
  deleteQAPair,
  exportQATemplate,
  getQAPairs,
  getQAStats,
  updateQAPair,
  QA_CATEGORY_LIST,
  QA_CATEGORY_LABELS,
  type QAPair,
  type QACategory,
} from '../lib/qaLibraryService';

export default function QALibraryPage() {
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getQAStats>>({ total: 0, active: 0, byCategory: [], totalUsage: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<QACategory | ''>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QAPair | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '', category: 'other' as QACategory, tags: '', is_active: true });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const loadData = () => {
    setPairs(getQAPairs({
      search: searchTerm || undefined,
      category: filterCategory || undefined,
      active_only: filterActive === 'active',
    }));
    setStats(getQAStats());
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadData(); }, [searchTerm, filterCategory, filterActive]);

  const openCreate = () => {
    setEditingItem(null);
    setEditForm({ question: '', answer: '', category: 'other', tags: '', is_active: true });
    setEditDialogOpen(true);
  };

  const openEdit = (item: QAPair) => {
    setEditingItem(item);
    setEditForm({
      question: item.question,
      answer: item.answer,
      category: item.category,
      tags: (item.tags || []).join(', '),
      is_active: item.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      showSnackbar('问题与答案不能为空', 'error');
      return;
    }
    const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingItem) {
      updateQAPair(editingItem.id, {
        question: editForm.question,
        answer: editForm.answer,
        category: editForm.category,
        tags,
        is_active: editForm.is_active,
      });
      showSnackbar('问答已更新', 'success');
    } else {
      createQAPair({
        question: editForm.question,
        answer: editForm.answer,
        category: editForm.category,
        tags,
      });
      showSnackbar('问答已创建', 'success');
    }
    setEditDialogOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条问答吗？')) {
      deleteQAPair(id);
      loadData();
      showSnackbar('问答已删除', 'success');
    }
  };

  const handleToggleActive = (item: QAPair) => {
    updateQAPair(item.id, { is_active: !item.is_active });
    loadData();
    showSnackbar(item.is_active ? '问答已停用' : '问答已启用', 'success');
  };

  const handleExport = () => {
    const text = exportQATemplate();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `问答库-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('问答库已导出', 'success');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showSnackbar('已复制到剪贴板', 'success');
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ message, severity });
  };

  const getCategoryChip = (cat: QACategory) => {
    const colorMap: Record<QACategory, 'info' | 'warning' | 'error' | 'success' | 'default'> = {
      product_inquiry: 'info',
      delivery_return: 'warning',
      after_sales: 'error',
      promotion: 'success',
      other: 'default',
    };
    return <Chip label={QA_CATEGORY_LABELS[cat]} size="small" color={colorMap[cat]} />;
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          问答库
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理客户常见问题与标准回答，AI 助手和客服场景自动调用
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">总问答数</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">已启用</Typography>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">总使用次数</Typography>
              <Typography variant="h4">{stats.totalUsage}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">分类分布</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {stats.byCategory.filter(c => c.count > 0).map(c => (
                  <Chip key={c.category} label={`${c.label}:${c.count}`} size="small" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 工具栏 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            新建问答
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
            导出模板
          </Button>
          <Button variant="text" startIcon={<RefreshIcon />} onClick={loadData}>
            刷新
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            placeholder="搜索问题或答案..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ width: 220 }}
          />
          <TextField
            select
            size="small"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as QACategory | '')}
            sx={{ width: 130 }}
          >
            <MenuItem value="">全部分类</MenuItem>
            {QA_CATEGORY_LIST.map(cat => (
              <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            size="small"
            value={filterActive}
            exclusive
            onChange={(_, v) => v && setFilterActive(v)}
          >
            <ToggleButton value="all">全部</ToggleButton>
            <ToggleButton value="active">已启用</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* 问答列表 */}
      {pairs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            暂无问答数据
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            点击"新建问答"添加第一条客户常见问题与标准回答
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>问题</TableCell>
                <TableCell>答案</TableCell>
                <TableCell>分类</TableCell>
                <TableCell align="center">使用次数</TableCell>
                <TableCell align="center">状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pairs.map(item => (
                <TableRow key={item.id} sx={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <TableCell sx={{ maxWidth: 250 }}>
                    <Typography noWrap title={item.question}>{item.question}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography noWrap variant="body2" color="text.secondary" title={item.answer}>
                      {item.answer}
                    </Typography>
                  </TableCell>
                  <TableCell>{getCategoryChip(item.category)}</TableCell>
                  <TableCell align="center">{item.usage_count}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleToggleActive(item)} color={item.is_active ? 'success' : 'default'}>
                      {item.is_active ? <ActiveIcon /> : <InactiveIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="复制答案"><IconButton size="small" onClick={() => handleCopy(item.answer)}><CopyIcon fontSize="small" /></IconButton></Tooltip>
                    <IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? '编辑问答' : '新建问答'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="客户问题"
              multiline
              rows={2}
              fullWidth
              value={editForm.question}
              onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
              placeholder="例如：这个商品能退货吗？"
            />
            <TextField
              label="标准回答"
              multiline
              rows={4}
              fullWidth
              value={editForm.answer}
              onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
              placeholder="输入标准的回复内容..."
            />
            <TextField
              select
              label="分类"
              fullWidth
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value as QACategory })}
            >
              {QA_CATEGORY_LIST.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="标签（逗号分隔）"
              fullWidth
              value={editForm.tags}
              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              placeholder="例如：退货, 售后, 生鲜"
            />
            {editingItem && (
              <FormControlLabel
                control={<Switch checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />}
                label="已启用"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">保存</Button>
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
