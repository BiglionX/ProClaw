// ProClaw Cloud 托管版 - AI 客服 Provider 组件
// 封装 ChatWidget，自动从认证状态获取 tenant_id

'use client';

import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/auth-store';

// 动态导入 ChatWidget（减少初始 bundle 体积）
const ChatWidget = dynamic(
  () => import('@/components/CustomerService/ChatWidget'),
  { ssr: false }
);

interface CustomerServiceProviderProps {
  // 可选：手动指定 tenant_id（用于公开页面）
  tenantId?: string;
}

export default function CustomerServiceProvider({ tenantId: externalTenantId }: CustomerServiceProviderProps) {
  const { user } = useAuthStore();

  // 优先使用外部传入的 tenant_id，其次是认证用户的 ID
  const effectiveTenantId = externalTenantId || user?.id;

  if (!effectiveTenantId) return null;

  return <ChatWidget tenantId={effectiveTenantId} />;
}
