import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  TextField,
  FormControl,
  FormLabel,
  Chip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Camera as CameraIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  confidence?: number;
}

interface RecognitionResult {
  draft_id: string;
  items: OrderItem[];
  total_amount: number;
  confidence: number;
  message?: string;
}

const AISalesOrderPage: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [recognizing, setRecognizing] = useState<boolean>(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [_draftId, setDraftId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // 通知提示
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 计算总额
  const calculateTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // 处理图片上传
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      showSnackbar('只支持 JPG、PNG、HEIC 格式', 'error');
      return;
    }

    // 检查文件大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      showSnackbar('图片大小不能超过 10MB', 'error');
      return;
    }

    setImageFile(file);
    
    // 生成预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 调用 AI 识别
  const handleRecognize = async () => {
    if (!imageFile) {
      showSnackbar('请先上传图片', 'error');
      return;
    }

    setRecognizing(true);
    try {
      // 将图片转换为 base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onload = async () => {
        // const base64 = reader.result as string;

        try {
          // 模拟API调用
          // const base64Data = base64.split(',')[1];
          // const response = await apiClient.post('/api/ai/recognize_order', {
          //   image_base64: base64Data,
          //   image_type: imageFile.type.split('/')[1],
          // });

          // 模拟数据
          const mockResponse: RecognitionResult = {
            draft_id: 'draft_' + Date.now(),
            items: [
              {
                product_name: '红富士苹果',
                quantity: 10,
                unit_price: 5.5,
                subtotal: 55,
                confidence: 0.92,
              },
              {
                product_name: '香蕉',
                quantity: 5,
                unit_price: 3.5,
                subtotal: 17.5,
                confidence: 0.85,
              },
            ],
            total_amount: 72.5,
            confidence: 0.88,
            message: '识别成功',
          };

          setOrderItems(mockResponse.items);
          setTotalAmount(mockResponse.total_amount);
          setConfidence(mockResponse.confidence);
          setDraftId(mockResponse.draft_id);
          
          showSnackbar('AI 识别完成', 'success');
        } catch (error) {
          console.error('AI recognition failed:', error);
          showSnackbar('AI 识别失败', 'error');
        } finally {
          setRecognizing(false);
        }
      };

      reader.onerror = () => {
        showSnackbar('图片读取失败', 'error');
        setRecognizing(false);
      };
    } catch (error) {
      console.error('Failed to process image:', error);
      showSnackbar('图片处理失败', 'error');
      setRecognizing(false);
    }
  };

  // 添加商品项
  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_name: '',
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
      },
    ]);
  };

  // 更新商品项
  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 自动计算小计
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setOrderItems(newItems);
    setTotalAmount(calculateTotal(newItems));
  };

  // 删除商品项
  const handleDeleteItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
    setTotalAmount(calculateTotal(newItems));
  };

  // 提交订单
  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      showSnackbar('请添加至少一个商品', 'error');
      return;
    }

    // 检查是否有空白商品名
    const hasEmptyName = orderItems.some(item => !item.product_name);
    if (hasEmptyName) {
      showSnackbar('请填写所有商品名称', 'error');
      return;
    }

    setLoading(true);
    try {
      // 模拟API调用
      // await apiClient.post('/api/sales_orders/draft/${draftId}/submit', {
      //   items: orderItems,
      //   notes,
      // });

      showSnackbar('订单提交成功', 'success');
      
      // 清空表单
      setOrderItems([]);
      setTotalAmount(0);
      setDraftId('');
      setImageFile(null);
      setImagePreview(null);
      setNotes('');
    } catch (error) {
      console.error('Failed to submit order:', error);
      showSnackbar('订单提交失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (orderItems.length === 0) {
      showSnackbar('请添加至少一个商品', 'error');
      return;
    }

    setLoading(true);
    try {
      // 模拟API调用
      // await apiClient.post('/api/sales_orders/draft', {
      //   items: orderItems,
      //   notes,
      // });

      showSnackbar('草稿保存成功', 'success');
    } catch (error) {
      console.error('Failed to save draft:', error);
      showSnackbar('草稿保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示通知
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon fontSize="large" />
          AI 订单识别
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`识别置信度: ${(confidence * 100).toFixed(1)}%`}
            color={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'warning' : 'error'}
            sx={{ fontWeight: 500 }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        {/* 左侧 - 图片上传区 */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ backgroundColor: '#f8f8f8', borderRadius: 2, p: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                上传订单图片
              </Typography>
              
              {/* 上传区域 */}
              <Box
                sx={{
                  border: '2px dashed #6366f1',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f0f0ff',
                  },
                }}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {imagePreview ? (
                  <Box sx={{ position: 'relative' }}>
                    <img
                      src={imagePreview}
                      alt="预览"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 300,
                        borderRadius: 8,
                      }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <>
                    <CameraIcon sx={{ fontSize: 60, color: '#6366f1', mb: 2 }} />
                    <Typography>点击上传或拖拽图片到此处</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      支持 JPG、PNG、HEIC 格式，最大 10MB
                    </Typography>
                  </>
                )}
              </Box>
              
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/heic"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              
              {/* 识别按钮 */}
              <Button
                fullWidth
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={handleRecognize}
                disabled={!imageFile || recognizing}
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                  },
                }}
              >
                {recognizing ? <CircularProgress size={24} /> : '开始 AI 识别'}
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* 右侧 - 识别结果编辑区 */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ backgroundColor: '#fff', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                识别结果
              </Typography>
              
              {orderItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <InfoIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                  <Typography color="textSecondary">
                    上传图片并点击“开始 AI 识别”按钮
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* 商品列表 */}
                  <TableContainer component={Box} sx={{ mb: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>商品名称</TableCell>
                          <TableCell align="right">数量</TableCell>
                          <TableCell align="right">单价</TableCell>
                          <TableCell align="right">小计</TableCell>
                          <TableCell align="right">操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <TextField
                                size="small"
                                value={item.product_name}
                                onChange={(e) => handleUpdateItem(index, 'product_name', e.target.value)}
                                placeholder="输入商品名称"
                                fullWidth
                              />
                              {item.confidence && item.confidence < 0.8 && (
                                <Chip
                                  label={`置信度: ${(item.confidence * 100).toFixed(1)}%`}
                                  size="small"
                                  color="warning"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 1 }}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0, step: 0.01 }}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography>¥{item.subtotal.toFixed(2)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteItem(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* 添加商品按钮 */}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    sx={{ mb: 2 }}
                  >
                    添加商品
                  </Button>

                  {/* 总计 */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Typography variant="h6">
                      合计: <span style={{ color: '#ef4444' }}>¥{totalAmount.toFixed(2)}</span>
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
            
            {/* 操作按钮 */}
            {orderItems.length > 0 && (
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button
                  onClick={handleSaveDraft}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} /> : '保存草稿'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={<CheckIcon />}
                >
                  {loading ? <CircularProgress size={20} /> : '提交订单'}
                </Button>
              </CardActions>
            )}
          </Card>
        </Box>
      </Box>

      {/* 备注 */}
      {orderItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <FormLabel>订单备注</FormLabel>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可选填备注信息"
            />
          </FormControl>
        </Box>
      )}

      {/* 提示信息 */}
      <Alert severity="info" sx={{ mt: 2 }}>
        提示：AI 识别结果可能需要人工修正。置信度低于 80% 的商品会标记为警告。
      </Alert>

      {/* 通知提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AISalesOrderPage;