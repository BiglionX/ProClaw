import {
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  DesktopWindows as PreviewIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
  Snackbar,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getCloudStore, getStoreTheme, updateStoreTheme, generateThemeWithAI, StoreTheme as StoreThemeType, CloudStore, getSyncableProducts } from '../../lib/cloudStoreService';
import { isTauri } from '../../lib/tauri';
import { generateLogo, generateBanner, dataURLtoBlob } from '../../lib/brandAssetGenerator';

interface StoreThemeProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StoreTheme({
  loading, setLoading, setError, setSuccessMessage,
}: StoreThemeProps) {
  const [store, setStore] = useState<CloudStore | null>(null);
  const [theme, setTheme] = useState<StoreThemeType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [industry, setIndustry] = useState('零售');
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);

  const loadStore = async () => {
    try {
      const storeData = await getCloudStore();
      setStore(storeData);
      return storeData;
    } catch (err) {
      console.error('加载商城信息失败:', err);
      return null;
    }
  };

  const loadTheme = async (storeData?: CloudStore | null) => {
    const currentStore = storeData || store;
    if (!currentStore) {
      // 使用默认值
      setTheme({
        store_id: '',
        primary_color: '#1890ff',
        secondary_color: '#f5f5f5',
        layout_style: 'card',
        font_family: 'PingFang SC, Microsoft YaHei, sans-serif',
        banner_images: [],
        theme_data: {},
        updated_at: new Date().toISOString(),
      });
      return;
    }
    
    try {
      setLoading(true);
      const data = await getStoreTheme(currentStore.id);
      setTheme(data);
    } catch {
      // 使用默认值
      setTheme({
        store_id: currentStore.id,
        primary_color: '#1890ff',
        secondary_color: '#f5f5f5',
        layout_style: 'card',
        font_family: 'PingFang SC, Microsoft YaHei, sans-serif',
        banner_images: [],
        theme_data: {},
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取商品分类和价格区间
  const getProductInfo = async (): Promise<{ categories: string[]; priceRange: string }> => {
    try {
      const products = await getSyncableProducts();
      const categories: string[] = [];
      let minPrice = Infinity;
      let maxPrice = 0;

      for (const product of products) {
        // 从 SKU 中取 sell_price 作为价格参考
        const price = product.skus?.[0]?.sell_price;
        if (price !== undefined) {
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        }
      }

      const finalCategories = categories.length > 0 ? [...new Set(categories)] : ['通用商品'];
      const priceRange = minPrice === Infinity ? '¥0-1000' : `¥${minPrice.toFixed(0)}-${maxPrice.toFixed(0)}`;

      return { categories: finalCategories, priceRange };
    } catch (err) {
      console.error('获取商品信息失败:', err);
      return { categories: ['通用商品'], priceRange: '¥100-1000' };
    }
  };

  useEffect(() => {
    const init = async () => {
      const storeData = await loadStore();
      await loadTheme(storeData);
    };
    init();
  }, []);

  const handleGenerateAI = async () => {
    if (!store) {
      setError('请先开通云商城');
      return;
    }
    try {
      setGenerating(true);
      setSuccessMessage('AI 正在生成主题，请稍候...');
      
      // 动态获取商品分类和价格区间
      const { categories, priceRange } = await getProductInfo();
      
      const newTheme = await generateThemeWithAI(
        store.id,
        industry,
        categories,
        priceRange
      );
      setTheme(newTheme);
      setSuccessMessage('AI 主题生成成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!theme) return;
    try {
      setSaving(true);
      const saved = await updateStoreTheme(theme.store_id, {
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        layout_style: theme.layout_style,
        font_family: theme.font_family,
      });
      setTheme(saved);
      setSuccessMessage('主题配置已保存！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateTheme = (updates: Partial<StoreThemeType>) => {
    if (!theme) return;
    setTheme({ ...theme, ...updates });
  };

  // 上传 Logo
  const handleUploadLogo = async () => {
    if (!isTauri()) {
      setError('文件上传功能仅在桌面端可用');
      return;
    }
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile, writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      
      const selected = await open({
        multiple: false,
        filters: [{
          name: '图片',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg']
        }]
      });

      if (!selected || Array.isArray(selected)) return;

      // 读取文件
      const fileData = await readFile(selected.path!);
      const fileName = `logo_${Date.now()}.${selected.path!.split('.').pop()}`;
      
      // 保存到应用数据目录
      await writeFile(fileName, fileData, { baseDir: BaseDirectory.AppData });
      
      // 更新主题配置
      const logoUrl = `tauri://localhost/${fileName}`;
      await updateStoreTheme(store?.id || '', { logo_url: logoUrl });
      setTheme(prev => prev ? { ...prev, logo_url: logoUrl } : null);
      setSuccessMessage('Logo 上传成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    }
  };

  // 上传 Banner
  const handleUploadBanner = async () => {
    if (!isTauri()) {
      setError('文件上传功能仅在桌面端可用');
      return;
    }
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile, writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      
      const selected = await open({
        multiple: false,
        filters: [{
          name: '图片',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
        }]
      });

      if (!selected || Array.isArray(selected)) return;

      // 读取文件
      const fileData = await readFile(selected.path!);
      const fileName = `banner_${Date.now()}.${selected.path!.split('.').pop()}`;
      
      // 保存到应用数据目录
      await writeFile(fileName, fileData, { baseDir: BaseDirectory.AppData });
      
      // 更新主题配置
      const bannerUrl = `tauri://localhost/${fileName}`;
      const currentBanners = theme?.banner_images || [];
      const newBanners = [...currentBanners, bannerUrl];
      
      await updateStoreTheme(store?.id || '', { banner_images: newBanners });
      setTheme(prev => prev ? { ...prev, banner_images: newBanners } : null);
      setSuccessMessage('Banner 上传成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    }
  };

  // AI 生成 Logo
  const handleGenerateLogo = async () => {
    try {
      setGeneratingLogo(true);
      setSuccessMessage('AI 正在生成 Logo...');
      const storeName = store?.subdomain || 'My Store';
      const tagline = '';
      const dataUrl = await generateLogo({
        storeName,
        tagline,
        primaryColor: theme?.primary_color || '#1890ff',
        secondaryColor: theme?.secondary_color || '#f5f5f5',
      });

      // 保存为文件（Tauri）或直接用 data URL（浏览器）
      if (isTauri()) {
        const blob = dataURLtoBlob(dataUrl);
        const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const fileName = `logo_${Date.now()}.png`;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(fileName, bytes, { baseDir: BaseDirectory.AppData });
        const logoUrl = `tauri://localhost/${fileName}`;
        await updateStoreTheme(store?.id || '', { logo_url: logoUrl });
        setTheme(prev => prev ? { ...prev, logo_url: logoUrl } : null);
      } else {
        await updateStoreTheme(store?.id || '', { logo_url: dataUrl });
        setTheme(prev => prev ? { ...prev, logo_url: dataUrl } : null);
      }
      setSuccessMessage('AI Logo 生成成功！');
    } catch (err) {
      console.error('AI 生成 Logo 失败:', err);
      setError(err instanceof Error ? err.message : 'AI 生成 Logo 失败');
    } finally {
      setGeneratingLogo(false);
    }
  };

  // AI 生成轮播图
  const handleGenerateBanner = async () => {
    try {
      setGeneratingBanner(true);
      setSuccessMessage('AI 正在生成轮播图...');
      const storeName = store?.subdomain || 'My Store';
      const tagline = '品质保障 · 诚信经营';
      const dataUrl = await generateBanner({
        storeName,
        tagline,
        primaryColor: theme?.primary_color || '#1890ff',
        secondaryColor: theme?.secondary_color || '#f5f5f5',
      });

      if (isTauri()) {
        const blob = dataURLtoBlob(dataUrl);
        const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const fileName = `banner_${Date.now()}.jpg`;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(fileName, bytes, { baseDir: BaseDirectory.AppData });
        const bannerUrl = `tauri://localhost/${fileName}`;
        const currentBanners = theme?.banner_images || [];
        const newBanners = [...currentBanners, bannerUrl];
        await updateStoreTheme(store?.id || '', { banner_images: newBanners });
        setTheme(prev => prev ? { ...prev, banner_images: newBanners } : null);
      } else {
        const currentBanners = theme?.banner_images || [];
        const newBanners = [...currentBanners, dataUrl];
        await updateStoreTheme(store?.id || '', { banner_images: newBanners });
        setTheme(prev => prev ? { ...prev, banner_images: newBanners } : null);
      }
      setSuccessMessage('AI 轮播图生成成功！');
    } catch (err) {
      console.error('AI 生成轮播图失败:', err);
      setError(err instanceof Error ? err.message : 'AI 生成轮播图失败');
    } finally {
      setGeneratingBanner(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!store) {
    return (
      <Alert severity="warning">
        请先在「商城概览」中开通云商城。
      </Alert>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        配置商城外观主题，支持 AI 自动生成配色方案。
      </Alert>

      <Grid container spacing={3}>
        {/* AI 生成区 */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                <AIIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                AI 主题生成
              </Typography>
              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={16} /> : <AIIcon />}
                onClick={handleGenerateAI}
                disabled={generating}
                sx={{ bgcolor: '#ff3b30', '&:hover': { bgcolor: '#e0352b' } }}
              >
                {generating ? '生成中...' : 'AI 生成主题'}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              根据您的商品分类、价格区间和行业属性，AI 将自动生成匹配的商城主题配色和布局方案。
            </Typography>
          </Paper>
        </Grid>

        {/* 主题色配置 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>主题色配置</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>主色调</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: theme?.primary_color || '#1890ff',
                      border: '2px solid', borderColor: 'divider',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('primary-color-input')?.click()}
                  />
                  <TextField
                    id="primary-color-input"
                    type="color"
                    value={theme?.primary_color || '#1890ff'}
                    onChange={e => updateTheme({ primary_color: e.target.value })}
                    sx={{ width: 100 }}
                    size="small"
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>辅助色</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: theme?.secondary_color || '#f5f5f5',
                      border: '2px solid', borderColor: 'divider',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('secondary-color-input')?.click()}
                  />
                  <TextField
                    id="secondary-color-input"
                    type="color"
                    value={theme?.secondary_color || '#f5f5f5'}
                    onChange={e => updateTheme({ secondary_color: e.target.value })}
                    sx={{ width: 100 }}
                    size="small"
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>布局风格</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['card', 'list'] as const).map(style => (
                    <Button
                      key={style}
                      variant={theme?.layout_style === style ? 'contained' : 'outlined'}
                      onClick={() => updateTheme({ layout_style: style })}
                      size="small"
                    >
                      {style === 'card' ? '卡片式' : '列表式'}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 品牌素材上传 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>品牌素材</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Logo 上传 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>商城 Logo</Typography>
                {theme?.logo_url ? (
                  <Box sx={{ mb: 1 }}>
                    <img src={theme.logo_url} alt="Logo" style={{ maxHeight: 60, maxWidth: '100%', borderRadius: 4 }} />
                  </Box>
                ) : null}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3, borderStyle: 'dashed', borderColor: 'primary.main',
                    textAlign: 'center', cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={handleUploadLogo}
                >
                  <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    点击上传 Logo（建议 200x60px）
                  </Typography>
                </Paper>
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={generatingLogo ? <CircularProgress size={14} /> : <AIIcon />}
                    onClick={handleGenerateLogo}
                    disabled={generatingLogo}
                    sx={{ color: '#ff3b30', borderColor: '#ff3b30', fontSize: 12 }}
                  >
                    {generatingLogo ? '生成中...' : 'AI 生成'}
                  </Button>
                </Box>
              </Box>
              {/* Banner 上传 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>首页轮播图</Typography>
                {theme?.banner_images?.length > 0 ? (
                  <Box sx={{ mb: 1, display: 'flex', gap: 1, overflow: 'auto' }}>
                    {theme.banner_images.map((url, i) => (
                      <img key={i} src={url} alt={`Banner ${i + 1}`} style={{ height: 50, borderRadius: 4 }} />
                    ))}
                  </Box>
                ) : null}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3, borderStyle: 'dashed', borderColor: 'primary.main',
                    textAlign: 'center', cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={handleUploadBanner}
                >
                  <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    点击上传轮播图（建议 1920x600px）
                  </Typography>
                </Paper>
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={generatingBanner ? <CircularProgress size={14} /> : <AIIcon />}
                    onClick={handleGenerateBanner}
                    disabled={generatingBanner}
                    sx={{ color: '#ff3b30', borderColor: '#ff3b30', fontSize: 12 }}
                  >
                    {generatingBanner ? '生成中...' : 'AI 生成'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 预览区 */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                <PreviewIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                主题预览
              </Typography>
              <Button variant="outlined" startIcon={<PreviewIcon />} onClick={() => setPreviewOpen(!previewOpen)}>
                {previewOpen ? '收起预览' : '展开预览'}
              </Button>
            </Box>
            {previewOpen && (
              <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* 模拟导航栏 */}
                <Box sx={{ p: 2, bgcolor: theme?.primary_color || '#1890ff', color: '#fff' }}>
                  <Typography variant="h6">My Store</Typography>
                </Box>
                {/* 模拟内容区 */}
                <CardContent sx={{ bgcolor: theme?.secondary_color || '#f5f5f5' }}>
                  <Grid container spacing={2}>
                    {[1, 2, 3, 4].map(i => (
                      <Grid item xs={6} sm={3} key={i}>
                        <Card>
                          <Box sx={{ height: 120, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary">商品图片</Typography>
                          </Box>
                          <CardContent>
                            <Typography variant="body2">示例商品 {i}</Typography>
                            <Typography variant="subtitle2" sx={{ color: theme?.primary_color || '#1890ff', fontWeight: 700 }}>
                              ¥99.00
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 保存按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadTheme} disabled={saving}>
          重置
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !theme}>
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </Box>
    </Box>
  );
}
