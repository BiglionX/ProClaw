import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibleIcon,
  VisibilityOff as InvisibleIcon,
  Sync as SyncIcon,
  AddPhotoAlternate as ImageIcon,
  CameraAlt as CameraIcon,
  ImageSearch as ImageSearchIcon,
  SmartToy as AIIcon,
  Download as DownloadIcon,
  PhotoLibrary as GalleryIcon,
  PhoneAndroid as MobileIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductSPU } from '../../lib/productService';
import { isTauri } from '../../lib/tauri';
import { getCloudStore, getSyncableProducts, syncAllProducts, syncIncremental, toggleProductVisible, SyncStatus, CloudStore } from '../../lib/cloudStoreService';
import {
  searchProductImages,
  searchBatchProductImages,
  downloadImageAsDataUrl,
  ImageSearchResult,
  SearchMode,
  BatchSearchProgress,
} from '../../lib/imageSearchEngine';

/** Blob 转 data URL */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface StoreProductsProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

type SyncFilter = 'all' | 'synced' | 'pending' | 'failed';

export default function StoreProducts({
  loading, setLoading, setError, setSuccessMessage,
}: StoreProductsProps) {
  const [store, setStore] = useState<CloudStore | null>(null);
  const [products, setProducts] = useState<ProductSPU[]>([]);
  const [search, setSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSpuId, setUploadingSpuId] = useState<string | null>(null);

  // === AI 智能找图状态 ===
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [aiSearchMode, setAiSearchMode] = useState<SearchMode>('single');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState<ImageSearchResult[]>([]);
  const [aiCurrentProductId, setAiCurrentProductId] = useState<string | null>(null);
  const [aiCurrentProductName, setAiCurrentProductName] = useState('');
  // 批量模式
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchSearchProgress | null>(null);
  const [batchResults, setBatchResults] = useState<Map<string, ImageSearchResult[]>>(new Map());
  const [batchConfirmPhase, setBatchConfirmPhase] = useState(false);
  // 单商品搜索结果弹窗
  const [singleResultOpen, setSingleResultOpen] = useState(false);

  // === 移动端检测 ===
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return (
      /Android|iPhone|iPad|iPod|webOS/i.test(ua) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 768)
    );
  }, []);

  const loadStore = async () => {
    try {
      const storeData = await getCloudStore();
      setStore(storeData);
    } catch (err) {
      console.error('加载商城信息失败:', err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getSyncableProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载商品失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
    loadProducts();
  }, []);

  const handleToggleVisible = async (spu: ProductSPU) => {
    try {
      await toggleProductVisible(spu.id, !spu.is_on_sale);
      setSuccessMessage(`${spu.name} 已${spu.is_on_sale ? '下架' : '上架'}`);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  // 点击图片触发上传
  const handleImageClick = (spuId: string) => {
    setUploadingSpuId(spuId);
    if (isTauri()) {
      handleTauriUpload(spuId);
    } else {
      fileInputRef.current?.click();
    }
  };

  // 桌面端：Tauri 文件对话框
  const handleTauriUpload = async (spuId: string) => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({
        multiple: false,
        filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
      });
      if (!selected || Array.isArray(selected)) { setUploadingSpuId(null); return; }
      const fileData = await readFile(selected);
      const ext = selected.split('.').pop() || 'jpg';
      const blob = new Blob([fileData], { type: `image/${ext}` });
      const dataUrl = await blobToDataUrl(blob);
      applyProductImage(spuId, dataUrl);
    } catch (err) {
      console.error('上传图片失败:', err);
      setUploadingSpuId(null);
    }
  };

  // 浏览器端：<input type="file">
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingSpuId) { setUploadingSpuId(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      applyProductImage(uploadingSpuId, reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyProductImage = (spuId: string, dataUrl: string) => {
    setProducts(prev => prev.map(p =>
      p.id === spuId
        ? { ...p, images: [{ id: `img_${Date.now()}`, spu_id: spuId, image_url: dataUrl, image_type: 'main' as const, sort_order: 1 }] }
        : p
    ));
    setUploadingSpuId(null);
    setSuccessMessage('商品图片已更新');
  };

  // === 手机拍照上传 ===
  /** 触发手机摄像头拍照 */
  const handleCameraCapture = (spuId: string) => {
    setUploadingSpuId(spuId);
    cameraInputRef.current?.click();
  };

  /** 拍照/相册文件变化处理（移动端 camera input） */
  const handleCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingSpuId) { setUploadingSpuId(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      applyProductImage(uploadingSpuId, reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // === AI 智能找图 ===
  /** 打开找图模式选择 */
  const handleOpenAISearch = () => {
    setAiSearchOpen(true);
    setAiSearchMode('single');
    setAiSearchQuery('');
    setAiSearchResults([]);
    setAiCurrentProductId(null);
  };

  /** 执行单个商品图片搜索 */
  const handleSingleSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setAiSearching(true);
    try {
      const results = await searchProductImages(aiSearchQuery.trim(), undefined, 15);
      setAiSearchResults(results);
    } catch (err) {
      console.error('AI找图失败:', err);
      setError('AI找图失败，请检查网络连接');
    } finally {
      setAiSearching(false);
    }
  };

  /** 对单个商品打开 AI 找图 */
  const handleAISearchForProduct = (spu: ProductSPU) => {
    setAiCurrentProductId(spu.id);
    setAiCurrentProductName(spu.name);
    setAiSearchQuery(spu.name + (spu.description ? ' ' + spu.description.slice(0, 80) : ''));
    setAiSearchMode('single');
    setAiSearchResults([]);
    setSingleResultOpen(true);
  };

  /** 选中搜索结果并应用到商品 */
  const handleSelectSearchResult = async (result: ImageSearchResult, spuId: string) => {
    if (result.source === 'fallback') {
      // 兜底链接：打开浏览器搜索
      window.open(result.large, '_blank');
      return;
    }
    try {
      setAiSearching(true);
      const dataUrl = await downloadImageAsDataUrl(result.medium);
      applyProductImage(spuId, dataUrl);
      setSingleResultOpen(false);
      setAiSearchResults([]);
      setSuccessMessage(`已为商品应用 AI 找图结果 (来源: ${result.source})`);
    } catch (err) {
      console.error('下载图片失败:', err);
      setError('图片下载失败，请重试');
    } finally {
      setAiSearching(false);
    }
  };

  /** 打开批量找图对话框 */
  const handleOpenBatchSearch = () => {
    setBatchSelectedIds(new Set());
    setBatchProgress(null);
    setBatchResults(new Map());
    setBatchConfirmPhase(false);
    setBatchDialogOpen(true);
  };

  /** 切换批量选择 */
  const toggleBatchSelect = (spuId: string) => {
    setBatchSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(spuId)) next.delete(spuId); else next.add(spuId);
      return next;
    });
  };

  /** 全选/取消全选 */
  const toggleSelectAll = () => {
    const filtered = filteredProducts;
    if (batchSelectedIds.size === filtered.length) {
      setBatchSelectedIds(new Set());
    } else {
      setBatchSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  /** 执行批量搜索 */
  const handleBatchSearch = async () => {
    if (batchSelectedIds.size === 0) {
      setError('请至少选择一个商品');
      return;
    }
    setAiSearching(true);
    setBatchConfirmPhase(false);
    const selectedProducts = products
      .filter(p => batchSelectedIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, description: p.description }));

    try {
      const results = await searchBatchProductImages(selectedProducts, 6, (progress) => {
        setBatchProgress(progress);
      });
      setBatchResults(results);
      setBatchConfirmPhase(true);
      setSuccessMessage(`批量搜索完成！共为 ${results.size} 个商品找到图片`);
    } catch (err) {
      console.error('批量找图失败:', err);
      setError('批量找图失败，请检查网络');
    } finally {
      setAiSearching(false);
    }
  };

  /** 批量确认：一键应用第一张 */
  const handleBatchApplyAll = async () => {
    setAiSearching(true);
    let applied = 0;
    for (const [spuId, results] of batchResults) {
      if (results.length > 0 && results[0].source !== 'fallback') {
        try {
          const dataUrl = await downloadImageAsDataUrl(results[0].medium);
          setProducts(prev => prev.map(p =>
            p.id === spuId
              ? { ...p, images: [{ id: `img_${Date.now()}`, spu_id: spuId, image_url: dataUrl, image_type: 'main' as const, sort_order: 1 }] }
              : p
          ));
          applied++;
        } catch { /* skip failed */ }
      }
    }
    setAiSearching(false);
    setBatchDialogOpen(false);
    setBatchResults(new Map());
    setBatchProgress(null);
    setBatchConfirmPhase(false);
    setSuccessMessage(`已为 ${applied} 个商品应用 AI 找图结果`);
  };

  const handleSyncAll = async () => {
    if (!store) {
      setError('请先开通云商城');
      return;
    }
    try {
      setSyncing(true);
      setSuccessMessage('正在全量同步商品到云端...');
      await syncAllProducts(store.id);
      setSuccessMessage('全量同步完成！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncIncremental = async () => {
    if (!store) {
      setError('请先开通云商城');
      return;
    }
    try {
      setSyncing(true);
      setSuccessMessage('正在增量同步...');
      await syncIncremental(store.id);
      setSuccessMessage('增量同步完成！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  // 模拟同步状态（实际应从后端获取）
  const getSyncStatus = (spu: ProductSPU): SyncStatus => {
    if (spu.is_on_sale) return 'success';
    return 'pending';
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.spu_code.toLowerCase().includes(search.toLowerCase());
    const matchSync = syncFilter === 'all' || getSyncStatus(p) === syncFilter;
    return matchSearch && matchSync;
  });

  return (
    <Box>
      {/* 同步进度 */}
      {syncing && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* 操作栏 */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="搜索商品 (名称/编码)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadProducts()}
          size="small"
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>同步状态</InputLabel>
          <Select
            value={syncFilter}
            label="同步状态"
            onChange={e => setSyncFilter(e.target.value as SyncFilter)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="success">已同步</MenuItem>
            <MenuItem value="pending">待同步</MenuItem>
            <MenuItem value="failed">同步失败</MenuItem>
          </Select>
        </FormControl>

        {/* AI 智能找图按钮组 */}
        <Tooltip title="根据商品名称智能搜索网络图片">
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AIIcon />}
            onClick={handleOpenAISearch}
            size="small"
          >
            AI智能找图
          </Button>
        </Tooltip>

        {/* 桌面端手机拍照提示 */}
        {!isMobile && (
          <Chip
            icon={<MobileIcon />}
            label="手机端可拍照上传"
            variant="outlined"
            color="info"
            size="small"
          />
        )}

        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />} onClick={handleSyncAll} disabled={syncing}>
          全量同步
        </Button>
        <Button variant="outlined" startIcon={<SyncIcon />} onClick={handleSyncIncremental} disabled={syncing}>
          增量同步
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadProducts} disabled={loading}>
          刷新
        </Button>
      </Paper>

      {/* 商品列表 */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">商品列表 ({filteredProducts.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 64 }}>图片</TableCell>
                <TableCell>商品名称</TableCell>
                <TableCell>SPU 编码</TableCell>
                <TableCell align="right">售价</TableCell>
                <TableCell align="right">库存</TableCell>
                <TableCell>上架状态</TableCell>
                <TableCell>同步状态</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无商品数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(spu => {
                  const syncStatus = getSyncStatus(spu);
                  return (
                    <TableRow key={spu.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {/* 主图片区域 */}
                          <Box
                            onClick={() => handleImageClick(spu.id)}
                            sx={{
                              width: 56, height: 56, borderRadius: 1, overflow: 'hidden',
                              cursor: 'pointer', position: 'relative',
                              bgcolor: 'grey.100', border: '1px solid',
                              borderColor: 'divider',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              '&:hover .upload-overlay': { opacity: 1 },
                            }}
                          >
                            {spu.images?.[0]?.image_url ? (
                              <img src={spu.images[0].image_url} alt={spu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Typography sx={{ fontSize: 10, color: 'text.disabled', textAlign: 'center', lineHeight: 1.2 }}>
                                {spu.name.charAt(0)}<br />添加
                              </Typography>
                            )}
                            <Box
                              className="upload-overlay"
                              sx={{
                                position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: 'opacity 0.2s',
                              }}
                            >
                              <ImageIcon sx={{ color: '#fff', fontSize: 20 }} />
                            </Box>
                          </Box>

                          {/* 操作按钮列 */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                            {/* AI 找图按钮 */}
                            <Tooltip title="AI智能找图">
                              <IconButton
                                size="small"
                                onClick={() => handleAISearchForProduct(spu)}
                                sx={{ p: 0.3, color: 'secondary.main' }}
                              >
                                <ImageSearchIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>

                            {/* 手机拍照按钮（仅移动端或始终展示） */}
                            <Tooltip title={isMobile ? '拍照上传' : '拍照上传（需手机端）'}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    if (isMobile) {
                                      handleCameraCapture(spu.id);
                                    } else {
                                      setSuccessMessage('请使用手机浏览器打开 ProClaw 网页版拍照上传 📱');
                                    }
                                  }}
                                  sx={{ p: 0.3, color: isMobile ? 'primary.main' : 'text.disabled' }}
                                >
                                  <CameraIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 500 }}>{spu.name}</Typography>
                        {spu.subtitle && <Typography variant="caption" color="text.secondary">{spu.subtitle}</Typography>}
                      </TableCell>
                      <TableCell><Chip label={spu.spu_code} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>
                          ¥{spu.skus?.[0]?.sell_price?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{spu.skus?.[0]?.current_stock || 0}</TableCell>
                      <TableCell>
                        <Switch
                          checked={spu.is_on_sale}
                          onChange={() => handleToggleVisible(spu)}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          label={spu.is_on_sale ? '已上架' : '未上架'}
                          size="small"
                          color={spu.is_on_sale ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={syncStatus === 'success' ? '已同步' : syncStatus === 'pending' ? '待同步' : '同步失败'}
                          size="small"
                          color={syncStatus === 'success' ? 'success' : syncStatus === 'pending' ? 'warning' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" onClick={() => handleToggleVisible(spu)}>
                          {spu.is_on_sale ? <InvisibleIcon fontSize="small" sx={{ mr: 0.5 }} /> : <VisibleIcon fontSize="small" sx={{ mr: 0.5 }} />}
                          {spu.is_on_sale ? '下架' : '上架'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 隐藏的文件上传（浏览器模式） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* 隐藏的相机拍照输入（移动端 capture） */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraFileChange}
      />

      {/* ====== AI 找图模式选择对话框 ====== */}
      <Dialog open={aiSearchOpen} onClose={() => setAiSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="secondary" /> AI 智能找图
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            根据商品名称自动搜索网络图片，快速为商品配上专业图片。
          </Typography>

          <Grid container spacing={2}>
            <Grid xs={6}>
              <Card
                variant="outlined"
                sx={{
                  p: 2, cursor: 'pointer', textAlign: 'center',
                  borderColor: aiSearchMode === 'single' ? 'secondary.main' : 'divider',
                  borderWidth: aiSearchMode === 'single' ? 2 : 1,
                  '&:hover': { borderColor: 'secondary.light' },
                }}
                onClick={() => setAiSearchMode('single')}
              >
                <ImageSearchIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="subtitle2">单个找图</Typography>
                <Typography variant="caption" color="text.secondary">
                  输入关键词搜索
                </Typography>
              </Card>
            </Grid>
            <Grid xs={6}>
              <Card
                variant="outlined"
                sx={{
                  p: 2, cursor: 'pointer', textAlign: 'center',
                  borderColor: aiSearchMode === 'batch' ? 'secondary.main' : 'divider',
                  borderWidth: aiSearchMode === 'batch' ? 2 : 1,
                  '&:hover': { borderColor: 'secondary.light' },
                }}
                onClick={() => {
                  setAiSearchMode('batch');
                  setAiSearchOpen(false);
                  handleOpenBatchSearch();
                }}
              >
                <GalleryIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="subtitle2">批量找图</Typography>
                <Typography variant="caption" color="text.secondary">
                  勾选多个商品，一键搜索
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {aiSearchMode === 'single' && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="搜索关键词"
                placeholder="例如：iPhone 15 Pro Max 电池"
                value={aiSearchQuery}
                onChange={e => setAiSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSingleSearch()}
                size="small"
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <Button
                      variant="contained"
                      size="small"
                      color="secondary"
                      onClick={handleSingleSearch}
                      disabled={aiSearching || !aiSearchQuery.trim()}
                      startIcon={aiSearching ? <CircularProgress size={14} /> : <ImageSearchIcon />}
                    >
                      搜索
                    </Button>
                  ),
                }}
              />

              {aiSearchResults.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    找到 {aiSearchResults.length} 张图片（点击选择应用到当前商品）
                  </Typography>
                  <Grid container spacing={1}>
                    {aiSearchResults.map((result) => (
                      <Grid xs={4} key={result.id}>
                        {result.source === 'fallback' ? (
                          <Card
                            variant="outlined"
                            sx={{
                              p: 1, cursor: 'pointer', textAlign: 'center',
                              height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              '&:hover': { borderColor: 'secondary.main' },
                            }}
                            onClick={() => window.open(result.large, '_blank')}
                          >
                            <Typography variant="caption">{result.alt}</Typography>
                          </Card>
                        ) : (
                          <Box
                            onClick={() => {
                              setAiSearchOpen(false);
                              if (aiCurrentProductId) {
                                handleSelectSearchResult(result, aiCurrentProductId);
                              }
                            }}
                            sx={{
                              position: 'relative', cursor: 'pointer', borderRadius: 1,
                              overflow: 'hidden', border: '2px solid transparent',
                              '&:hover': { borderColor: 'secondary.main', transform: 'scale(1.03)' },
                              transition: 'all 0.15s',
                            }}
                          >
                            <img
                              src={result.thumbnail}
                              alt={result.alt}
                              style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
                                px: 0.5, fontSize: 9, textAlign: 'center',
                              }}
                            >
                              {result.source}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiSearchOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* ====== 单商品 AI 找图结果弹窗 ====== */}
      <Dialog
        open={singleResultOpen}
        onClose={() => { setSingleResultOpen(false); setAiSearchResults([]); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageSearchIcon color="secondary" />
          AI 找图：{aiCurrentProductName}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="调整搜索关键词"
            value={aiSearchQuery}
            onChange={e => setAiSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSingleSearch()}
            size="small"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSingleSearch}
            disabled={aiSearching}
            startIcon={aiSearching ? <CircularProgress size={14} /> : <ImageSearchIcon />}
            sx={{ mb: 2 }}
          >
            {aiSearching ? '搜索中...' : '搜索'}
          </Button>

          {aiSearchResults.length > 0 && (
            <Grid container spacing={1.5}>
              {aiSearchResults.map((result) => (
                <Grid xs={4} key={result.id}>
                  {result.source === 'fallback' ? (
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2, cursor: 'pointer', textAlign: 'center',
                        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '&:hover': { borderColor: 'secondary.main' },
                      }}
                      onClick={() => window.open(result.large, '_blank')}
                    >
                      <Typography variant="caption">{result.alt}</Typography>
                    </Card>
                  ) : (
                    <Box
                      onClick={() => handleSelectSearchResult(result, aiCurrentProductId!)}
                      sx={{
                        position: 'relative', cursor: 'pointer', borderRadius: 1,
                        overflow: 'hidden', border: '2px solid transparent',
                        '&:hover': { borderColor: 'secondary.main', transform: 'scale(1.03)' },
                        transition: 'all 0.15s',
                      }}
                    >
                      <img
                        src={result.thumbnail}
                        alt={result.alt}
                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                      />
                      <Box
                        sx={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          bgcolor: 'rgba(0,0,0,0.65)', color: '#fff',
                          px: 0.5, py: 0.2, fontSize: 10,
                          display: 'flex', justifyContent: 'space-between',
                        }}
                      >
                        <span>{result.source}</span>
                        <span>{result.photographer}</span>
                      </Box>
                    </Box>
                  )}
                </Grid>
              ))}
            </Grid>
          )}

          {!aiSearching && aiSearchResults.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ImageSearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                输入关键词后点击"搜索"，AI 将为你找到合适的商品图片
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSingleResultOpen(false); setAiSearchResults([]); }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====== 批量找图对话框 ====== */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => { if (!aiSearching) { setBatchDialogOpen(false); setBatchConfirmPhase(false); } }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GalleryIcon color="secondary" />
          {batchConfirmPhase ? '批量搜索结果确认' : '批量AI找图 — 选择商品'}
        </DialogTitle>
        <DialogContent>
          {!batchConfirmPhase ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                勾选需要找图的商品，系统将根据商品名称自动搜索图片。
              </Typography>
              <Button size="small" onClick={toggleSelectAll} sx={{ mb: 1 }}>
                {batchSelectedIds.size === filteredProducts.length ? '取消全选' : '全选'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                已选 {batchSelectedIds.size} 个
              </Typography>

              <Box sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}>
                {filteredProducts.map(spu => (
                  <Box
                    key={spu.id}
                    onClick={() => toggleBatchSelect(spu.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, py: 0.8, px: 1,
                      cursor: 'pointer', borderRadius: 1,
                      bgcolor: batchSelectedIds.has(spu.id) ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={batchSelectedIds.has(spu.id)}
                      onChange={() => toggleBatchSelect(spu.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Box sx={{ width: 32, height: 32, borderRadius: 0.5, overflow: 'hidden', bgcolor: 'grey.100', flexShrink: 0 }}>
                      {spu.images?.[0]?.image_url ? (
                        <img src={spu.images[0].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'text.disabled' }}>
                          {spu.name.charAt(0)}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{spu.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{spu.spu_code}</Typography>
                    </Box>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      ¥{spu.skus?.[0]?.sell_price?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* 搜索进度 */}
              {batchProgress && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(batchProgress.current / batchProgress.total) * 100}
                    sx={{ borderRadius: 1, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    正在搜索：{batchProgress.productName} ({batchProgress.current}/{batchProgress.total})
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                搜索完成！共为 {batchResults.size} 个商品找到图片。点击缩略图可替换，或使用"一键应用全部"。
              </Typography>
              <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                {Array.from(batchResults.entries()).map(([spuId, results]) => {
                  const spu = products.find(p => p.id === spuId);
                  return (
                    <Box key={spuId} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {spu?.name || spuId}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                        {results.slice(0, 6).map((result) => (
                          result.source !== 'fallback' ? (
                            <Box
                              key={result.id}
                              onClick={async () => {
                                try {
                                  const dataUrl = await downloadImageAsDataUrl(result.medium);
                                  setProducts(prev => prev.map(p =>
                                    p.id === spuId
                                      ? { ...p, images: [{ id: `img_${Date.now()}`, spu_id: spuId, image_url: dataUrl, image_type: 'main' as const, sort_order: 1 }] }
                                      : p
                                  ));
                                  setSuccessMessage(`已为 "${spu?.name}" 更新图片`);
                                } catch {
                                  setError('图片下载失败');
                                }
                              }}
                              sx={{
                                width: 80, height: 80, flexShrink: 0, borderRadius: 1,
                                overflow: 'hidden', cursor: 'pointer',
                                border: '2px solid transparent',
                                '&:hover': { borderColor: 'secondary.main' },
                              }}
                            >
                              <img src={result.thumbnail} alt={result.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                          ) : null
                        ))}
                        {results.filter(r => r.source !== 'fallback').length === 0 && (
                          <Typography variant="caption" color="text.disabled">未找到图片，可尝试手动上传</Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!batchConfirmPhase ? (
            <>
              <Button onClick={() => setBatchDialogOpen(false)} disabled={aiSearching}>取消</Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleBatchSearch}
                disabled={batchSelectedIds.size === 0 || aiSearching}
                startIcon={aiSearching ? <CircularProgress size={14} /> : <ImageSearchIcon />}
              >
                {aiSearching ? '搜索中...' : `开始搜索 (${batchSelectedIds.size}个)`}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => { setBatchDialogOpen(false); setBatchConfirmPhase(false); setBatchResults(new Map()); }}>
                关闭
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleBatchApplyAll}
                disabled={aiSearching}
                startIcon={aiSearching ? <CircularProgress size={14} /> : <DownloadIcon />}
              >
                一键应用全部
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
