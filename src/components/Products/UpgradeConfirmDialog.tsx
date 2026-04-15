import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircleOutline,
  WarningAmber,
  InfoOutlined,
  ArrowForward,
} from '@mui/icons-material';

interface UpgradeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  productCount?: number; // 待迁移商品数量
}

export const UpgradeConfirmDialog: React.FC<UpgradeConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  productCount = 0,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.message || '升级失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!loading ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        🚀 升级为电商商品库
      </DialogTitle>

      <DialogContent dividers>
        {/* 说明信息 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            升级后，您将可以使用多规格管理、多图展示等电商功能
          </Typography>
        </Alert>

        {/* 迁移说明 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            升级内容包括：
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleOutline color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="为每个商品创建SPU（标准产品单位）"
                secondary="保留原商品名称、描述、分类等信息"
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleOutline color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="为每个商品创建默认SKU"
                secondary={'规格标记为"标准"，价格库存保持不变'}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleOutline color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="自动迁移商品图片"
                secondary="原有图片将关联到对应的SPU"
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleOutline color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="原商品数据保留"
                secondary="在元数据中标记已迁移状态，不会删除"
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          </List>
        </Box>

        {/* 数据统计 */}
        {productCount > 0 && (
          <Alert severity="success" icon={<InfoOutlined />} sx={{ mb: 2 }}>
            <Typography variant="body2">
              检测到 <strong>{productCount}</strong> 个商品将被迁移
            </Typography>
          </Alert>
        )}

        {/* 注意事项 */}
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            注意事项：
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>升级过程不可逆（除非手动降级）</li>
            <li>建议在升级前备份数据库</li>
            <li>升级期间请勿关闭应用</li>
          </Typography>
        </Alert>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* 加载进度 */}
        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              正在迁移数据，请稍候...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
        >
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
          variant="contained"
          startIcon={loading ? null : <ArrowForward />}
          color="primary"
        >
          {loading ? '升级中...' : '确认升级'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
