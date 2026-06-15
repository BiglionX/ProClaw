import { useEffect, useState } from 'react';
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

const HS_DATABASE: HSCode[] = [
  { code: '8507.60.00', description: '锂离子电池 (Lithium-ion batteries)', duty_rate: '3.5%', category: '电子配件' },
  { code: '8504.40.95', description: '其他变压器、静止式变流器 (Static converters)', duty_rate: '2.5%', category: '电子配件' },
  { code: '3926.90.99', description: '其他塑料制品 (Other articles of plastics)', duty_rate: '5.3%', category: '包装材料' },
  { code: '4819.10.00', description: '瓦楞纸或纸板制的箱、盒、匣 (Cartons, boxes of paper)', duty_rate: '0%', category: '包装材料' },
];

const MOCK_DECLARATIONS: CustomsDeclaration[] = [
  { id: 'cd1', order_no: 'FO-2025-0078', hs_code: '8507.60.00', product_name: 'iPhone 15 Pro Max 电池', quantity: 200, unit_price: 12.5, total_value: 2500, origin_country: 'CN', destination_country: 'US', status: 'cleared', declared_at: '2025-06-15' },
  { id: 'cd2', order_no: 'FO-2025-0079', hs_code: '8507.60.00', product_name: 'iPhone 14 Plus 电池', quantity: 150, unit_price: 10.8, total_value: 1620, origin_country: 'CN', destination_country: 'DE', status: 'submitted', declared_at: '2025-07-08' },
  { id: 'cd3', order_no: 'FO-2025-0080', hs_code: '8507.60.00', product_name: 'iPhone SE (第三代) 电池', quantity: 500, unit_price: 5.5, total_value: 2750, origin_country: 'CN', destination_country: 'BR', status: 'draft', declared_at: '2025-07-10' },
];

const STATUS_LABEL: Record<CustomsDeclaration['status'], { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '已申报', color: 'warning' },
  cleared: { label: '已放行', color: 'success' },
  rejected: { label: '已退回', color: 'error' },
};

export default function CustomsTab() {
  const [keyword, setKeyword] = useState('电池');
  const [hsResults, setHsResults] = useState<HSCode[]>(HS_DATABASE);
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>(MOCK_DECLARATIONS);
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  useEffect(() => {
    loadDeclarations();
  }, []);

  const loadDeclarations = async () => {
    setLoading(true);
    try {
      const list = await safeInvoke<CustomsDeclaration[]>('list_customs_declarations', { limit: 50 });
      if (list && list.length > 0) {
        setDeclarations(list);
      }
    } catch {
      /* keep mock */
    } finally {
      setLoading(false);
    }
  };

  const handleSearchHS = async () => {
    setLoading(true);
    setAiSuggestion('');
    try {
      const result = await safeInvoke<HSCode[]>('search_hs_code', { keyword });
      if (result && result.length > 0) {
        setHsResults(result);
      } else if (keyword.trim()) {
        const filtered = HS_DATABASE.filter(h => h.code.includes(keyword) || h.description.toLowerCase().includes(keyword.toLowerCase()));
        setHsResults(filtered);
        if (filtered.length > 0) {
          setAiSuggestion(`💡 AI 推荐：${filtered[0].code} - ${filtered[0].description}（税率 ${filtered[0].duty_rate}）`);
        }
      } else {
        setHsResults(HS_DATABASE);
      }
    } catch {
      const filtered = HS_DATABASE.filter(h => h.code.includes(keyword) || h.description.toLowerCase().includes(keyword.toLowerCase()));
      setHsResults(filtered);
    } finally {
      setLoading(false);
    }
  };

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
