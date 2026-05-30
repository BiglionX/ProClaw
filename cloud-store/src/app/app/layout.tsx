// ProClaw Cloud 托管版 - App 布局（受保护路由的共享布局）
import AppLayout from '@/components/AppLayout';

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
