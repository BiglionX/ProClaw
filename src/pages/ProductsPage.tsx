import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Image as ImageIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Brand, getBrands } from '../lib/brandService';
import { Category, getCategories } from '../lib/categoryService';
import { uploadImage } from '../lib/imageService';
import {
  createProduct,
  CreateProductInput,
  deleteProduct,
  getProducts,
  Product as ProductType,
  updateProduct,
  // 新增：迁移相关 API
  getLibraryMode,
  migrateToEcommerceMode,
  downgradeToSimpleMode,
  MigrationResult,
  // 新增：自动生成SKU
  generateSimpleSKU,
} from '../lib/productService';
// 新增：导入模式切换组件
import {
  UpgradeConfirmDialog,
  DowngradeConfirmDialog,
  LibraryModeToggle,
} from '../components/Products';

export default function ProductsPage() {
  // ==================== 商品库模式状态 ====================
  const [libraryMode, setLibraryMode] = useState<'simple' | 'ecommerce'>('simple');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // ==================== 原有状态 ====================
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(
    null
  );
  const [formData, setFormData] = useState<CreateProductInput>({
    sku: '',
    name: '',
    description: '',
    cost_price: 0,
    sell_price: 0,
    current_stock: 0,
    min_stock: 0,
    max_stock: 999999,
    unit: '个',
  });
  // 新增：多图上传支持
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 加载产品列表
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts({
        limit: 100,
        search: searchTerm || undefined,
        category_id: selectedCategory || undefined,
        brand_id: selectedBrand || undefined,
      });
      setProducts(data);
    } catch (err: any) {
      setError(err.message || '加载产品列表失败');
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载分类和品牌
  const loadFilters = async () => {
    try {
      const [cats, brs] = await Promise.all([getCategories(), getBrands()]);
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  useEffect(() => {
    // 加载商品库模式
    const initMode = async () => {
      try {
        const mode = await getLibraryMode();
        setLibraryMode(mode);
      } catch (err) {
        console.error('Failed to get library mode:', err);
        setLibraryMode('simple'); // 默认简单模式
      }
    };
    
    loadProducts();
    loadFilters();
    initMode();
  }, []);

  // 当筛选条件改变时重新加载
  useEffect(() => {
    if (categories.length > 0 || brands.length > 0) {
      loadProducts();
    }
  }, [selectedCategory, selectedBrand]);

  // 打开新建/编辑对话框
  const handleOpenDialog = (product?: ProductType) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        cost_price: product.cost_price,
        sell_price: product.sell_price,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
        max_stock: product.max_stock,
        unit: product.unit,
      });
      // 兼容旧数据：如果有image_url，转换为数组
      if (product.image_url) {
        setImagePreviews([product.image_url]);
        setImageFiles([]); // 编辑时不保留文件对象，只保留预览
      } else {
        setImagePreviews([]);
        setImageFiles([]);
      }
    } else {
      setEditingProduct(null);
      // 新建时自动生成SKU
      const autoSKU = generateSimpleSKU();
      setFormData({
        sku: autoSKU,
        name: '',
        description: '',
        cost_price: 0,
        sell_price: 0,
        current_stock: 0,
        min_stock: 0,
        max_stock: 999999,
        unit: '个',
      });
      setImagePreviews([]);
      setImageFiles([]);
    }
    setOpenDialog(true);
    setError(null);
  };

  // 处理图片选择（支持多图）
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 验证文件数量
    const totalImages = imageFiles.length + files.length;
    if (totalImages > 5) {
      setError(`最多只能上传5张图片，当前已选择${imageFiles.length}张，还能选择${5 - imageFiles.length}张`);
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    // 验证每张图片
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} 不是有效的图片文件`);
        return;
      }

      // 电商标准：单张图片不超过2MB
      if (file.size > 2 * 1024 * 1024) {
        setError(`${file.name} 超过2MB限制（当前${(file.size / 1024 / 1024).toFixed(2)}MB）`);
        return;
      }

      newFiles.push(file);

      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        
        // 当所有图片都加载完成后更新状态
        if (newPreviews.length === newFiles.length) {
          setImageFiles(prev => [...prev, ...newFiles]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 删除指定图片
  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 清除所有图片
  const handleClearAllImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
  };

  // 保存产品
  const handleSave = async () => {
    try {
      setLoading(true);

      let imageUrl = editingProduct?.image_url || undefined;

      // 如果有新选择的图片，上传到后端（取第一张作为主图）
      if (imageFiles.length > 0) {
        try {
          // 上传所有新图片
          const uploadPromises = imageFiles.map(file => uploadImage(file));
          const uploadedUrls = await Promise.all(uploadPromises);
          
          // 第一张作为主图
          imageUrl = uploadedUrls[0];
          
          // TODO: 如果有多图字段，可以存储所有URL
          // 目前先以逗号分隔存储在image_url中
          if (uploadedUrls.length > 1) {
            imageUrl = uploadedUrls.join(',');
          }
        } catch (err) {
          setError('图片上传失败');
          setLoading(false);
          return;
        }
      }

      const productData = {
        ...formData,
        image_url: imageUrl,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setSuccessMessage('产品更新成功!');
      } else {
        await createProduct(productData);
        setSuccessMessage('产品创建成功!');
      }
      setOpenDialog(false);
      await loadProducts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除产品
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个产品吗?')) return;

    try {
      setLoading(true);
      await deleteProduct(id);
      setSuccessMessage('产品已删除');
      await loadProducts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 商品库模式迁移处理函数 ====================

  /**
   * 升级到电商商品库
   */
  const handleUpgrade = async () => {
    try {
      const result = await migrateToEcommerceMode();
      setMigrationResult(result);
      setLibraryMode('ecommerce');
      setSuccessMessage(`成功升级！迁移了${result.migrated_products}个商品`);
      
      // 重新加载商品列表
      await loadProducts();
    } catch (err: any) {
      setError(err.message || '升级失败');
    } finally {
      setShowUpgradeDialog(false);
    }
  };

  /**
   * 降级回简单商品库
   */
  const handleDowngrade = async () => {
    try {
      await downgradeToSimpleMode();
      setLibraryMode('simple');
      setMigrationResult(null); // 清除迁移结果
      setSuccessMessage('已返回简单商品库模式');
      await loadProducts();
    } catch (err: any) {
      setError(err.message || '降级失败');
    } finally {
      setShowDowngradeDialog(false);
    }
  };

  // 搜索
  const handleSearch = () => {
    loadProducts();
  };

  // 导出 CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      setError('没有可导出的产品');
      return;
    }

    // CSV 表头
    const headers = [
      'SKU',
      '产品名称',
      '成本价',
      '销售价',
      '当前库存',
      '最低库存',
      '最高库存',
      '单位',
      '状态',
    ];

    // CSV 数据行
    const rows = products.map(product => [
      product.sku,
      product.name,
      product.cost_price.toFixed(2),
      product.sell_price.toFixed(2),
      product.current_stock,
      product.min_stock,
      product.max_stock,
      product.unit,
      product.status === 'active' ? '活跃' : '停用',
    ]);

    // 组合 CSV 内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // 创建 Blob 并下载
    const blob = new Blob([`\ufeff${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `products_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMessage(`成功导出 ${products.length} 个产品`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <Box>
      {/* 页面标题和模式切换 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 3 
      }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            {libraryMode === 'simple' ? '📦 商品管理' : '🛍️ 电商商品库'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {libraryMode === 'simple' 
              ? '适合小商家、农场、手工作坊' 
              : '支持多规格、多图、精细化库存管理'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {/* 模式切换按钮 */}
          <LibraryModeToggle
            currentMode={libraryMode}
            onUpgrade={() => setShowUpgradeDialog(true)}
            onDowngrade={() => setShowDowngradeDialog(true)}
          />
        </Box>
      </Box>

      {/* 成功提示 */}
      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 操作栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          placeholder="搜索产品 (SKU 或名称)"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
          size="small"
          sx={{ minWidth: 250, flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* 分类筛选 */}
        <TextField
          select
          label="分类"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        >
          <MenuItem value="">全部分类</MenuItem>
          {categories.map(cat => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>

        {/* 品牌筛选 */}
        <TextField
          select
          label="品牌"
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">全部品牌</MenuItem>
          {brands.map(brand => (
            <MenuItem key={brand.id} value={brand.id}>
              {brand.name}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadProducts();
            loadFilters();
          }}
          disabled={loading}
        >
          刷新
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          添加产品
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={products.length === 0}
        >
          导出 CSV
        </Button>
      </Paper>

      {/* 产品列表 */}
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>
                <strong>SKU</strong>
              </TableCell>
              <TableCell>
                <strong>产品名称</strong>
              </TableCell>
              <TableCell>
                <strong>成本价</strong>
              </TableCell>
              <TableCell>
                <strong>销售价</strong>
              </TableCell>
              <TableCell>
                <strong>当前库存</strong>
              </TableCell>
              <TableCell>
                <strong>状态</strong>
              </TableCell>
              <TableCell align="right">
                <strong>操作</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                  <Typography sx={{ mt: 1 }}>加载中...</Typography>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    暂无产品,点击"添加产品"开始创建
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map(product => (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>¥{product.cost_price.toFixed(2)}</TableCell>
                  <TableCell>¥{product.sell_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.current_stock}
                      color={
                        product.current_stock <= product.min_stock
                          ? 'error'
                          : product.current_stock >= product.max_stock
                            ? 'warning'
                            : 'success'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.status === 'active' ? '活跃' : '停用'}
                      color={
                        product.status === 'active' ? 'success' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(product)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(product.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新建/编辑产品对话框 */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingProduct ? '编辑产品' : '添加产品'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 图片上传区域 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  商品图片（最多5张，每张不超过2MB）
                </Typography>
                {imagePreviews.length > 0 && (
                  <Button
                    size="small"
                    color="error"
                    onClick={handleClearAllImages}
                    startIcon={<DeleteIcon fontSize="small" />}
                  >
                    清除所有
                  </Button>
                )}
              </Box>
              
              {imagePreviews.length > 0 ? (
                <Grid container spacing={2}>
                  {imagePreviews.map((preview, index) => (
                    <Grid item xs={6} sm={4} md={2.4} key={index}>
                      <Box sx={{ position: 'relative' }}>
                        <img
                          src={preview}
                          alt={`Product ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveImage(index)}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'background.paper',
                            boxShadow: 1,
                            '&:hover': { bgcolor: 'error.light', color: 'white' },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        {index === 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              textAlign: 'center',
                              fontSize: '10px',
                              py: 0.5,
                              borderRadius: '0 0 8px 8px',
                            }}
                          >
                            主图
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
                  {imagePreviews.length < 5 && (
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Box
                        sx={{
                          border: '2px dashed #ccc',
                          borderRadius: 2,
                          height: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover',
                          },
                        }}
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <AddIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                      </Box>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed #ccc',
                    borderRadius: 2,
                    p: 3,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() =>
                    document.getElementById('image-upload')?.click()
                  }
                >
                  <ImageIcon
                    sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    点击上传图片
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    支持 JPG, PNG, GIF (每张最大 2MB)
                  </Typography>
                </Box>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="SKU（自动生成，可修改）"
                    value={formData.sku}
                    onChange={e =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    required
                    size="small"
                    helperText="格式: SKU-日期-随机码"
                  />
                  {!editingProduct && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setFormData({ ...formData, sku: generateSimpleSKU() })}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      重新生成
                    </Button>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="产品名称"
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="描述"
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  multiline
                  rows={2}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="成本价"
                  type="number"
                  value={formData.cost_price}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      cost_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">¥</InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="销售价"
                  type="number"
                  value={formData.sell_price}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      sell_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">¥</InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="当前库存"
                  type="number"
                  value={formData.current_stock}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      current_stock: parseInt(e.target.value) || 0,
                    })
                  }
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="最低库存"
                  type="number"
                  value={formData.min_stock}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      min_stock: parseInt(e.target.value) || 0,
                    })
                  }
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="单位"
                  value={formData.unit}
                  onChange={e =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  select
                  size="small"
                >
                  <MenuItem value="个">个</MenuItem>
                  <MenuItem value="件">件</MenuItem>
                  <MenuItem value="箱">箱</MenuItem>
                  <MenuItem value="千克">千克</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== 迁移相关组件 ==================== */}
      
      {/* 升级确认对话框 */}
      <UpgradeConfirmDialog
        open={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onConfirm={handleUpgrade}
        productCount={products.length}
      />

      {/* 降级确认对话框 */}
      <DowngradeConfirmDialog
        open={showDowngradeDialog}
        onClose={() => setShowDowngradeDialog(false)}
        onConfirm={handleDowngrade}
      />

      {/* 迁移结果提示 */}
      {migrationResult && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setMigrationResult(null)}>
          迁移完成！创建了 {migrationResult.created_spus} 个SPU，
          {migrationResult.created_skus} 个SKU，
          迁移了 {migrationResult.migrated_images} 张图片
          （耗时 {migrationResult.duration_ms}ms）
        </Alert>
      )}
    </Box>
  );
}
