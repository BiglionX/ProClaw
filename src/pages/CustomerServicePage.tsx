// ProClaw 桌面端 - AI 客服管理页面
// 面向商户（老板/运营）的客服管理界面
// 包含标签页：待回复、聊天记录、问答库、客服设置

import {
  Chat as ChatIcon,
  History as HistoryIcon,
  MenuBook as KnowledgeIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  SmartToy as BotIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Badge,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ===== 类型定义 =====

interface TransferItem {
  id: string;
  session_id: string;
  customer_id: string;
  customer_name: string | null;
  question: string;
  transfer_reason: string;
  transfer_mode: string;
  status: string;
  created_at: string;
}

interface ChatLogItem {
  id: string;
  session_id: string;
  customer_id: string;
  customer_name: string | null;
  question: string;
  answer: string;
  answer_source: string;
  is_transferred: boolean;
  created_at: string;
}

interface KBItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CSSettings {
  is_enabled: boolean;
  auto_greeting: string;
  transfer_mode: 'direct' | 'ai_judged';
  avatar_url: string | null;
  agent_name: string;
  system_prompt: string;
}

// ===== 待回复标签页 =====

function PendingTransfersTab() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saveToKb, setSaveToKb] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer-service/transfers?status=pending&page=${page + 1}&page_size=20`);
      const result = await res.json();
      if (result.success) {
        setTransfers(result.data);
        setTotal(result.total);
      }
    } catch {
      // 桌面端可能无法直接调用云端 API，显示空列表
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleOpenReply = (item: TransferItem) => {
    setSelectedTransfer(item);
    setReplyText('');
    setSaveToKb(true);
    setReplyDialogOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedTransfer || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/customer-service/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfer_id: selectedTransfer.id,
          answer: replyText.trim(),
          save_to_kb: saveToKb,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSnackbar({ message: '回复已发送' + (saveToKb ? '，已保存到问答库' : ''), severity: 'success' });
        setReplyDialogOpen(false);
        fetchTransfers();
      } else {
        setSnackbar({ message: result.error || '回复失败', severity: 'error' });
      }
    } catch {
      setSnackbar({ message: '网络错误，请重试', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          待处理请求
          {total > 0 && (
            <Chip label={`${total} 条待处理`} color="error" size="small" sx={{ ml: 1.5 }} />
          )}
        </Typography>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchTransfers}>
          刷新
        </Button>
      </Box>

      {transfers.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
          <Typography color="text.secondary">暂无待处理的转人工请求</Typography>
        </Paper>
      ) : (
        <List>
          {transfers.map((item) => (
            <Paper key={item.id} sx={{ mb: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
              <ListItem
                secondaryAction={
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SendIcon />}
                    onClick={() => handleOpenReply(item)}
                  >
                    回复
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar><BotIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        客户 {item.customer_name || item.customer_id?.slice(0, 12) || '匿名'}
                      </Typography>
                      <Chip label="待回复" size="small" color="warning" />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 0.5 }}>
                        {item.question}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                        {item.transfer_reason && ` · ${item.transfer_reason}`}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}

      {total > 20 && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
        />
      )}

      {/* 回复对话框 */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>回复客户问题</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              客户问题：
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2">{selectedTransfer?.question}</Typography>
            </Paper>
          </Box>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="您的回复"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="请输入回复内容..."
          />
          <FormControlLabel
            control={<Switch checked={saveToKb} onChange={(e) => setSaveToKb(e.target.checked)} />}
            label="保存此问答到问答库（以后 AI 可直接回答类似问题）"
            sx={{ mt: 1.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {submitting ? '发送中...' : '发送回复'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar(null)}>
        <Alert severity={snackbar?.severity || 'info'} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ===== 聊天记录标签页 =====

function ChatHistoryTab() {
  const [logs, setLogs] = useState<ChatLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchLogs = useCallback(async (searchKeyword?: string) => {
    setLoading(true);
    try {
      let url = `/api/customer-service/history?page=${page + 1}&page_size=20`;
      if (searchKeyword) url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setLogs(result.data);
        setTotal(result.total);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs(keyword);
  }, [fetchLogs, keyword]);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索聊天记录（客户 ID / 关键词）"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>搜索</Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">暂无聊天记录</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>客户</TableCell>
                <TableCell>问题</TableCell>
                <TableCell>回答来源</TableCell>
                <TableCell>转人工</TableCell>
                <TableCell>时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {log.customer_name || log.customer_id?.slice(0, 12) || '匿名'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.customer_id?.slice(0, 16)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.question}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.answer_source === 'knowledge_base' ? '知识库' : log.answer_source === 'model' ? 'AI生成' : '人工回复'}
                      size="small"
                      color={log.answer_source === 'manual' ? 'success' : log.answer_source === 'knowledge_base' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {log.is_transferred ? <CheckIcon color="warning" fontSize="small" /> : <CloseIcon color="disabled" fontSize="small" />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > 20 && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
            />
          )}
        </TableContainer>
      )}
    </Box>
  );
}

// ===== 问答库管理标签页 =====

function KnowledgeBaseTab() {
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [editKeywords, setEditKeywords] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const CATEGORIES = [
    { value: 'general', label: '通用' },
    { value: 'product', label: '商品' },
    { value: 'order', label: '订单' },
    { value: 'shipping', label: '物流' },
    { value: 'return', label: '售后' },
    { value: 'other', label: '其他' },
  ];

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/customer-service/knowledge-base?page=${page + 1}&page_size=20`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      if (category) url += `&category=${category}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setItems(result.data);
        setTotal(result.total);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(0);
  };

  const handleOpenEdit = (item?: KBItem) => {
    if (item) {
      setEditingItem(item);
      setEditQuestion(item.question);
      setEditAnswer(item.answer);
      setEditCategory(item.category);
      setEditKeywords((item.keywords || []).join(', '));
    } else {
      setEditingItem(null);
      setEditQuestion('');
      setEditAnswer('');
      setEditCategory('general');
      setEditKeywords('');
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    setSubmitting(true);
    try {
      const keywords = editKeywords.split(/[,，、\s]+/).filter(Boolean);
      const body = {
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        category: editCategory,
        keywords,
      };

      const url = '/api/customer-service/knowledge-base';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = editingItem ? { ...body, id: editingItem.id } : body;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setSnackbar({ message: editingItem ? '问答已更新' : '问答已添加', severity: 'success' });
        setEditDialogOpen(false);
        fetchItems();
      } else {
        setSnackbar({ message: result.error || '保存失败', severity: 'error' });
      }
    } catch {
      setSnackbar({ message: '网络错误', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除此问答？')) return;
    try {
      const res = await fetch(`/api/customer-service/knowledge-base?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setSnackbar({ message: '问答已删除', severity: 'success' });
        fetchItems();
      }
    } catch {
      setSnackbar({ message: '删除失败', severity: 'error' });
    }
  };

  return (
    <Box>
      {/* 工具栏 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="搜索问答..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>分类</InputLabel>
          <Select value={category} label="分类" onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
            <MenuItem value="">全部</MenuItem>
            {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch}>搜索</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenEdit()}>
          添加问答
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <KnowledgeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">暂无问答，点击"添加问答"创建</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>问题</TableCell>
                <TableCell>答案</TableCell>
                <TableCell>分类</TableCell>
                <TableCell>关键词</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>{item.question}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 250 }}>
                    <Typography variant="body2" noWrap>{item.answer}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={CATEGORIES.find(c => c.value === item.category)?.label || item.category} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(item.keywords || []).slice(0, 3).map((kw, i) => (
                        <Chip key={i} label={kw} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.is_active ? '启用' : '禁用'} size="small" color={item.is_active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > 20 && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
            />
          )}
        </TableContainer>
      )}

      {/* 编辑问答对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? '编辑问答' : '添加问答'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="问题"
            value={editQuestion}
            onChange={(e) => setEditQuestion(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="答案"
            value={editAnswer}
            onChange={(e) => setEditAnswer(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>分类</InputLabel>
            <Select value={editCategory} label="分类" onChange={(e) => setEditCategory(e.target.value)}>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="关键词（逗号分隔）"
            value={editKeywords}
            onChange={(e) => setEditKeywords(e.target.value)}
            helperText="关键词用于精确匹配客户问题"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!editQuestion.trim() || !editAnswer.trim() || submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar(null)}>
        <Alert severity={snackbar?.severity || 'info'} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ===== 客服设置标签页 =====

function SettingsTab() {
  const [settings, setSettings] = useState<CSSettings>({
    is_enabled: true,
    auto_greeting: '您好，我是客服小如，请问有什么可以帮您？',
    transfer_mode: 'direct',
    avatar_url: null,
    agent_name: '智能客服',
    system_prompt: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer-service/settings');
      const result = await res.json();
      if (result.success && result.data) {
        setSettings({
          is_enabled: result.data.is_enabled ?? true,
          auto_greeting: result.data.auto_greeting || '您好，我是客服小如，请问有什么可以帮您？',
          transfer_mode: result.data.transfer_mode || 'direct',
          avatar_url: result.data.avatar_url || null,
          agent_name: result.data.agent_name || '智能客服',
          system_prompt: result.data.system_prompt || '',
        });
      }
    } catch {
      // 使用默认设置
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/customer-service/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (result.success) {
        setSnackbar({ message: '设置已保存', severity: 'success' });
      } else {
        setSnackbar({ message: result.error || '保存失败', severity: 'error' });
      }
    } catch {
      setSnackbar({ message: '网络错误', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* 基本设置 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>基本设置</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <FormControlLabel
                  control={<Switch checked={settings.is_enabled} onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })} />}
                  label="启用 AI 客服"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="客服名称"
                  value={settings.agent_name}
                  onChange={(e) => setSettings({ ...settings, agent_name: e.target.value })}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="自动问候语"
                  value={settings.auto_greeting}
                  onChange={(e) => setSettings({ ...settings, auto_greeting: e.target.value })}
                  multiline
                  rows={2}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 转人工配置 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>转人工配置</Typography>
              <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
                <InputLabel>转人工模式</InputLabel>
                <Select
                  value={settings.transfer_mode}
                  label="转人工模式"
                  onChange={(e) => setSettings({ ...settings, transfer_mode: e.target.value as 'direct' | 'ai_judged' })}
                >
                  <MenuItem value="direct">模式 A：无法回答时直接转人工</MenuItem>
                  <MenuItem value="ai_judged">模式 B：AI 判断后决定是否转人工</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                {settings.transfer_mode === 'direct'
                  ? '当 AI 无法自动回答时，直接生成转人工请求。'
                  : 'AI 会先判断问题是否需要人工处理（如议价、投诉等），仅必要时转人工。'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 客服头像 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>客服头像</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Avatar src={settings.avatar_url || undefined} sx={{ width: 64, height: 64 }}>
                  <BotIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    默认使用秘书风格头像，可上传自定义头像
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                  >
                    上传头像
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                      // TODO: 实现头像上传到 Supabase Storage
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setSettings({ ...settings, avatar_url: url });
                      }
                    }} />
                  </Button>
                  {settings.avatar_url && (
                    <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => setSettings({ ...settings, avatar_url: null })}>
                      清除
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* AI 客服系统提示词 */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>AI 客服系统提示词</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                自定义 AI 客服的人设、语气和行为规则。商品信息和知识库数据将自动注入到上下文中。
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                placeholder={'你是云商城「我的店铺」的智能客服助手。\n\n## 你的身份\n- 你是店铺的在线客服，专业、热情\n- 回答简洁明了，使用中文\n\n## 你的能力\n- 回答商品咨询（名称、价格、规格、库存）\n- 解答订单相关问题\n\n## 重要规则\n- 价格和库存以实际数据为准\n- 态度友善，代表店铺形象'}
                value={settings.system_prompt}
                onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                helperText="留空则使用默认提示词。支持 Markdown 格式，可用 {store_name} 占位符。"
              />
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </Box>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar(null)}>
        <Alert severity={snackbar?.severity || 'info'} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ===== 主页面 =====

export default function CustomerServicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeParam = searchParams.get('store');
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              AI 客服管理
            </Typography>
            {storeParam && (
              <Chip 
                label={`商城: ${storeParam}`} 
                color="success" 
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            {storeParam 
              ? `来自「${storeParam}」商城的客户咨询`
              : '管理云商城 AI 客服，查看聊天记录，维护问答库'}
          </Typography>
        </Box>
      </Box>

      {/* Tab 导航 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<Badge color="error" variant="dot"><ChatIcon /></Badge>} label="待回复" />
          <Tab icon={<HistoryIcon />} label="聊天记录" />
          <Tab icon={<KnowledgeIcon />} label="问答库" />
          <Tab icon={<SettingsIcon />} label="客服设置" />
        </Tabs>
      </Paper>

      {/* Tab 内容 */}
      <Box sx={{ minHeight: 400 }}>
        {tabValue === 0 && <PendingTransfersTab />}
        {tabValue === 1 && <ChatHistoryTab />}
        {tabValue === 2 && <KnowledgeBaseTab />}
        {tabValue === 3 && <SettingsTab />}
      </Box>
    </Box>
  );
}
