import { Navigate } from 'react-router-dom';

/**
 * 云商城尚未接通独立域名、真实订单和在线支付。
 * 侧栏不提供入口，状态只在设置 → 系统信息中显示为「开发中」。
 */
export default function CloudStorePage() {
  return <Navigate to="/settings" replace />;
}
