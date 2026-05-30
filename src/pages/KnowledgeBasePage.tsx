import {
  Delete as DeleteIcon,
  Description as DocIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
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
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  detectFileType,
  extractTextContent,
  formatKnowledgeFileSize,
  getKnowledgeDocuments,
  getKnowledgeStats,
  KNOWLEDGE_CATEGORY_LABELS,
  KNOWLEDGE_CATEGORY_LIST,
  type KnowledgeCategory,
  type KnowledgeDocument,
} from '../lib/knowledgeBaseService';

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <PdfIcon sx={{ fontSize: 40, color: '#e74c3c' }} />,
  word: <DocIcon sx={{ fontSize: 40, color: '#3498db' }} />,
  excel: <DocIcon sx={{ fontSize: 40, color: '#27ae60' }} />,
  image: <ImageIcon sx={{ fontSize: 40, color: '#9b59b6' }} />,
  text: <DocIcon sx={{ fontSize: 40, color: '#7f8c8d' }} />,
};

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getKnowledgeStats>>({ total: 0, active: 0, byCategory: [], totalSize: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<KnowledgeCategory | ''>('');
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setDocs(getKnowledgeDocuments({
      search: searchTerm || undefined,
      category: filterCategory || undefined,
    }));
    setStats(getKnowledgeStats());
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadData(); }, [searchTerm, filterCategory]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = detectFileType(file.name);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const contentText = fileType === 'text' ? extractTextContent(dataUrl, 'text') : '';
      createKnowledgeDocument({
        title: file.name,
        file_type: fileType,
        data_url: dataUrl,
        file_size: file.size,
        content_text: contentText,
      });
      successCount++;
    }
    loadData();
    showSnackbar(`已上传 ${successCount} 个文件`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个文档吗？')) {
      deleteKnowledgeDocument(id);
      loadData();
      showSnackbar('文档已删除', 'success');
    }
  };

  const handlePreview = (doc: KnowledgeDocument) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ message, severity });
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          资料库
        </Typography>
        <Typography variant="body1" color="text.secondary">
          存储业务相关文档和参考资料，AI 助手可检索回答客户提问
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">总文档</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">已启用</Typography>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">总大小</Typography>
              <Typography variant="h4">{formatKnowledgeFileSize(stats.totalSize)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 分类统计 */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {stats.byCategory.filter(c => c.count > 0).map(c => (
          <Chip key={c.category} label={`${c.label}: ${c.count}`} size="small" variant="outlined" />
        ))}
      </Box>

      {/* 工具栏 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            上传文档
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <Button variant="text" startIcon={<RefreshIcon />} onClick={loadData}>
            刷新
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            placeholder="搜索文档标题或内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ width: 240 }}
          />
          <TextField
            select
            size="small"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as KnowledgeCategory | '')}
            sx={{ width: 140 }}
          >
            <MenuItem value="">全部分类</MenuItem>
            {KNOWLEDGE_CATEGORY_LIST.map(cat => (
              <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* 文档列表 */}
      {docs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <DocIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            暂无文档
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            上传产品说明书、报价单、配送政策等业务文档
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>文件名</TableCell>
                <TableCell>分类</TableCell>
                <TableCell>类型</TableCell>
                <TableCell align="right">大小</TableCell>
                <TableCell align="right">上传时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {FILE_ICONS[doc.file_type] || <DocIcon sx={{ fontSize: 24 }} />}
                      <Typography noWrap sx={{ maxWidth: 300 }} title={doc.title}>
                        {doc.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={KNOWLEDGE_CATEGORY_LABELS[doc.category]}
                      size="small"
                      onClick={() => { setFilterCategory(doc.category); }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={doc.file_type.toUpperCase()} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatKnowledgeFileSize(doc.file_size)}</TableCell>
                  <TableCell align="right">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="预览">
                      <IconButton size="small" onClick={() => handlePreview(doc)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" onClick={() => handleDelete(doc.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 预览对话框 */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        {previewDoc && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {FILE_ICONS[previewDoc.file_type]}
                {previewDoc.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Chip label={KNOWLEDGE_CATEGORY_LABELS[previewDoc.category]} size="small" sx={{ mr: 1 }} />
                <Chip label={previewDoc.file_type.toUpperCase()} size="small" variant="outlined" sx={{ mr: 1 }} />
                <Chip label={formatKnowledgeFileSize(previewDoc.file_size)} size="small" variant="outlined" />
              </Box>
              {previewDoc.file_type === 'image' && previewDoc.data_url && (
                <Box sx={{ textAlign: 'center' }}>
                  <img src={previewDoc.data_url} alt={previewDoc.title} style={{ maxWidth: '100%', maxHeight: 500 }} />
                </Box>
              )}
              {previewDoc.file_type === 'text' && previewDoc.data_url && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {(() => {
                    try {
                      const base64 = previewDoc.data_url!.split(',')[1];
                      return atob(base64);
                    } catch {
                      return '无法预览此文件内容';
                    }
                  })()}
                </Paper>
              )}
              {(previewDoc.file_type === 'pdf' || previewDoc.file_type === 'word' || previewDoc.file_type === 'excel') && (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  {FILE_ICONS[previewDoc.file_type]}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {previewDoc.file_type.toUpperCase()} 格式暂不支持在线预览，请使用本地软件打开
                  </Typography>
                </Paper>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
            </DialogActions>
          </>
        )}
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
