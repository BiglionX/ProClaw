import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Gavel as CustomsIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface HSCode {
  code: string;
  description: string;
  duty_rate: string;
  category: string;
}

interface CustomsDeclaration {
  id: string;
  order_no: string;
  hs_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  origin_country: string;
  destination_country: string;
  status: 'draft' | 'submitted' | 'cleared' | 'rejected';
  declared_at: string;
}

const STATUS_LABEL: Record<CustomsDeclaration['status'], { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '已申报', color: 'warning' },
  cleared: { label: '已放行', color: 'success' },
  rejected: { label: '已退回', color: 'error' },
};

export default function CustomsTab() {
  const [keyword, setKeyword] = useState('电池');
  const [hsResults, setHsResults] = useState<HSCode[]>([]);
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const loadDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await safeInvoke<CustomsDeclaration[]>('list_customs_declarations', { limit: 50 });
      setDeclarations(Array.isArray(list) ? list : []);
    } catch {
      setDeclarations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchHS = useCallback(async () => {
    setLoading(true);
    setAiSuggestion('');
    try {
      const result = await safeInvoke<HSCode[]>('search_hs_code', { keyword });
      const rows = Array.isArray(result) ? result : [];
      setHsResults(rows);
      if (rows.length > 0) {
        const first = rows[0];
        setAiSuggestion(`💡 AI 推荐：${first.code} - ${first.description}（税率 ${first.duty_rate}）`);
      }
    } catch {
      setHsResults([]);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    loadDeclarations();
    handleSearchHS();
  }, [loadDeclarations, handleSearchHS]);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Card sx={{ mb: 3, bgcolor: '#FFFBEB' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <CustomsIcon color="warning" />
            <Typography variant="h6">📋 HS 编码自动匹配</Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="商品关键词（如：电池、屏幕、包装）"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchHS()}
            />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
              onClick={handleSearchHS}
              disabled={loading}
            >
              查询
            </Button>
          </Stack>
          {aiSuggestion && (
            <Alert severity="info" sx={{ mt: 2 }}>{aiSuggestion}</Alert>
          )}
        </CardContent>
      </Card>

      <Paper sx={{ mb: 3 }} variant="outlined">
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            HS 编码候选（{hsResults.length}）
          </Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>HS 编码</TableCell>
                <TableCell>商品描述</TableCell>
                <TableCell>税率</TableCell>
                <TableCell>分类</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hsResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      未找到匹配编码，尝试其他关键词。
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                hsResults.map(h => (
                  <TableRow key={h.code}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{h.code}</TableCell>
                    <TableCell>{h.description}</TableCell>
                    <TableCell><Chip size="small" label={h.duty_rate} color="primary" variant="outlined" /></TableCell>
                    <TableCell>{h.category}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="复制编码" onClick={() => handleCopy(h.code)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            报关单草稿（{declarations.length}）
          </Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={loadDeclarations}>刷新</Button>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>商品</TableCell>
                <TableCell>HS 编码</TableCell>
                <TableCell align="right">数量</TableCell>
                <TableCell align="right">总价 (USD)</TableCell>
                <TableCell>起运→目的地</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>申报日期</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {declarations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      暂无报关单。
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                declarations.map(d => {
                  const s = STATUS_LABEL[d.status];
                  return (
                    <TableRow key={d.id}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{d.order_no}</TableCell>
                      <TableCell>{d.product_name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{d.hs_code}</TableCell>
                      <TableCell align="right">{d.quantity}</TableCell>
                      <TableCell align="right">${d.total_value.toLocaleString()}</TableCell>
                      <TableCell>{d.origin_country} → {d.destination_country}</TableCell>
                      <TableCell><Chip size="small" label={s.label} color={s.color} /></TableCell>
                      <TableCell>{d.declared_at}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
