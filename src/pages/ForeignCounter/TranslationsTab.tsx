import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  Translate as TranslateIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface Translation {
  id: string;
  spu_id: string;
  spu_name: string;
  language: string;
  translated_name: string;
  translated_description: string;
  updated_at: string;
}

const LANGUAGES = [
  { code: 'en', name: '英语 (English)', flag: '🇺🇸' },
  { code: 'ja', name: '日语 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '韩语 (Korean)', flag: '🇰🇷' },
  { code: 'es', name: '西班牙语 (Spanish)', flag: '🇪🇸' },
  { code: 'fr', name: '法语 (French)', flag: '🇫🇷' },
  { code: 'de', name: '德语 (German)', flag: '🇩🇪' },
  { code: 'ru', name: '俄语 (Russian)', flag: '🇷🇺' },
  { code: 'pt', name: '葡萄牙语 (Portuguese)', flag: '🇵🇹' },
  { code: 'ar', name: '阿拉伯语 (Arabic)', flag: '🇸🇦' },
  { code: 'th', name: '泰语 (Thai)', flag: '🇹🇭' },
  { code: 'vi', name: '越南语 (Vietnamese)', flag: '🇻🇳' },
  { code: 'id', name: '印尼语 (Indonesian)', flag: '🇮🇩' },
];

export default function TranslationsTab() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [language, setLanguage] = useState('en');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [aiHint, setAiHint] = useState('');

  const loadTranslations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await safeInvoke<Translation[]>('list_foreign_translations', { language });
      setTranslations(Array.isArray(list) ? list : []);
    } catch {
      setTranslations([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  const handleAITranslate = async () => {
    if (!keyword.trim()) {
      setAiHint('请输入要翻译的商品名称');
      return;
    }
    setTranslating(true);
    setAiHint('');
    try {
      const preview = LANGUAGES.map(l => `${l.flag} ${l.name.split(' ')[0]}：${keyword} (Pro)`).join('\n');
      setAiHint(`🤖 AI 批量翻译预览（${LANGUAGES.length} 个语种）：\n\n${preview}\n\n（演示版：实际接入后将调用 DeepSeek / 谷歌翻译 API）`);
    } catch (err) {
      setAiHint('翻译失败：' + String(err));
    } finally {
      setTranslating(false);
    }
  };

  const filtered = translations.filter(t => !keyword || t.translated_name.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>目标语言</InputLabel>
            <Select value={language} label="目标语言" onChange={e => setLanguage(e.target.value as string)}>
              {LANGUAGES.map(l => (
                <MenuItem key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索商品名称或翻译..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <Button fullWidth variant="outlined" startIcon={<RefreshIcon />} onClick={loadTranslations}>
            刷新
          </Button>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3, bgcolor: '#F0F9FF' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <TranslateIcon color="primary" />
            <Typography variant="h6">🤖 AI 批量翻译</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              placeholder="输入中文商品名，例如：iPhone 15 Pro Max 电池"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={translating ? <CircularProgress size={16} /> : <SendIcon />}
              disabled={translating}
              onClick={handleAITranslate}
            >
              {translating ? '翻译中...' : 'AI 翻译'}
            </Button>
          </Stack>
          {aiHint && (
            <Alert severity={aiHint.startsWith('🤖') ? 'success' : 'warning'} sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {aiHint}
            </Alert>
          )}
        </CardContent>
      </Card>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SPU</TableCell>
              <TableCell>中文名</TableCell>
              <TableCell>翻译后名称</TableCell>
              <TableCell>翻译后描述</TableCell>
              <TableCell>更新时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    暂无翻译记录，点击上方「AI 翻译」生成。
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Chip size="small" label={t.spu_id} variant="outlined" />
                  </TableCell>
                  <TableCell>{t.spu_name}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t.translated_name}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="body2" noWrap title={t.translated_description}>
                      {t.translated_description}
                    </Typography>
                  </TableCell>
                  <TableCell>{t.updated_at}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
}
