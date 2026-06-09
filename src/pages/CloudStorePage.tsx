import {
  Storefront as StoreIcon,
  Inventory as ProductsIcon,
  Palette as ThemeIcon,
  Settings as SettingsIcon,
  Receipt as OrdersIcon,
  RateReview as ReviewsIcon,
  LocalOffer as CouponIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StoreDashboard from './CloudStorePages/StoreDashboard';
import StoreOrders from './CloudStorePages/StoreOrders';
import StoreProducts from './CloudStorePages/StoreProducts';
import StoreSettings from './CloudStorePages/StoreSettings';
import StoreTheme from './CloudStorePages/StoreTheme';
import StoreReviews from './CloudStorePages/StoreReviews';
import StoreCoupons from './CloudStorePages/StoreCoupons';

/**
 * 云商城管理主页面
 * 包含多个 Tab：概览、商品管理、主题配置、设置、订单管理、评价管理、优惠券管理
 */

export default function CloudStorePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 根据 URL 路径设置当前 Tab
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/products')) setTabValue(1);
    else if (path.includes('/theme')) setTabValue(2);
    else if (path.includes('/settings')) setTabValue(3);
    else if (path.includes('/orders')) setTabValue(4);
    else if (path.includes('/reviews')) setTabValue(5);
    else if (path.includes('/coupons')) setTabValue(6);
    else setTabValue(0);
  }, [location.pathname]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const paths = ['/shop', '/shop/products', '/shop/theme', '/shop/settings', '/shop/orders', '/shop/reviews', '/shop/coupons'];
    navigate(paths[newValue]);
  };

  const tabProps = {
    loading,
    setLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          云托管商城
        </Typography>
        <Typography variant="body1" color="text.secondary">
          一键开通独立域名商城，AI 自动生成主题，商品一键同步
        </Typography>
      </Box>

      {/* Tab 导航 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<StoreIcon />} label="商城概览" />
          <Tab icon={<ProductsIcon />} label="商品管理" />
          <Tab icon={<ThemeIcon />} label="主题配置" />
          <Tab icon={<SettingsIcon />} label="商城设置" />
          <Tab icon={<OrdersIcon />} label="订单管理" />
          <Tab icon={<ReviewsIcon />} label="评价管理" />
          <Tab icon={<CouponIcon />} label="优惠券管理" />
        </Tabs>
      </Paper>

      {/* Tab 内容 */}
      {tabValue === 0 && <StoreDashboard {...tabProps} />}
      {tabValue === 1 && <StoreProducts {...tabProps} />}
      {tabValue === 2 && <StoreTheme {...tabProps} />}
      {tabValue === 3 && <StoreSettings {...tabProps} />}
      {tabValue === 4 && <StoreOrders {...tabProps} />}
      {tabValue === 5 && <StoreReviews {...tabProps} />}
      {tabValue === 6 && <StoreCoupons {...tabProps} />}

      {/* 错误提示 */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>

      {/* 成功提示 */}
      <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
