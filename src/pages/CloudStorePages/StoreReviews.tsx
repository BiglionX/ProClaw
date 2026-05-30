import {
  Delete as DeleteIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface ProductReview {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  content?: string;
  images: string[];
  reply?: string;
  reply_time?: number;
  created_at: string;
}

interface StoreReviewsProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StoreReviews({
  loading, setLoading, setError, setSuccessMessage,
}: StoreReviewsProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadReviews = async (_productId?: string) => {
    try {
      setLoading(true);
      // 暂时使用模拟数据
      const mockReviews: ProductReview[] = [
        {
          id: '1',
          user_id: 'u1',
          user_name: '张三',
          rating: 5,
          content: '商品质量很好，物流也很快！',
          images: [],
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'u2',
          user_name: '李四',
          rating: 4,
          content: '还不错，性价比高。',
          images: [],
          reply: '感谢您的好评！',
          reply_time: Date.now(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setReviews(mockReviews);
      
      // 后续对接真实 API
      // const result = await invoke<{ data: ProductReview[] }>('get_product_reviews', {
      //   productId: productId || '',
      //   page: 1,
      //   pageSize: 20,
      // });
      // setReviews(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载评价失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleReply = async () => {
    if (!selectedReview || !replyContent.trim()) {
      setError('请输入回复内容');
      return;
    }
    try {
      setLoading(true);
      // 暂时模拟
      setSuccessMessage('回复成功！');
      setReplyDialogOpen(false);
      setReplyContent('');
      loadReviews();
      
      // 后续对接真实 API
      // await invoke('reply_product_review', {
      //   reviewId: selectedReview.id,
      //   reply: replyContent,
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : '回复失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    try {
      setLoading(true);
      // 暂时模拟
      setSuccessMessage('删除成功！');
      setDeleteDialogOpen(false);
      loadReviews();
      
      // 后续对接真实 API
      // await invoke('delete_product_review', {
      //   reviewId: selectedReview.id,
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        管理商品评价，及时回复客户反馈。
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {reviews.map(review => (
            <Grid item xs={12} key={review.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {review.user_name}
                      </Typography>
                      <Rating value={review.rating} readOnly size="small" />
                    </Box>
                    <Box>
                      <Button
                        size="small"
                        startIcon={<ReplyIcon />}
                        onClick={() => {
                          setSelectedReview(review);
                          setReplyDialogOpen(true);
                        }}
                      >
                        回复
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          setSelectedReview(review);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        删除
                      </Button>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {review.content}
                  </Typography>

                  {review.reply && (
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        商家回复：
                      </Typography>
                      <Typography variant="body2">{review.reply}</Typography>
                    </Paper>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {new Date(review.created_at).toLocaleString('zh-CN')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {reviews.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" align="center">
                暂无评价数据
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* 回复对话框 */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>回复评价</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              客户：{selectedReview?.user_name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              评分：<Rating value={selectedReview?.rating} readOnly size="small" />
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              评价内容：{selectedReview?.content}
            </Typography>
            <TextField
              label="回复内容"
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="请输入回复内容..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleReply}
            disabled={!replyContent.trim() || loading}
          >
            {loading ? <CircularProgress size={20} /> : '发送回复'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除这条评价吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
