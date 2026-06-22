import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 修复多 lockfile 时的根目录检测
  turbopack: {
    root: import.meta.dirname || process.cwd(),
  },

  // Docker 独立部署支持
  output: 'standalone',

  // 图片远程域名白名单 (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // HTTP Headers 安全配置
  async headers() {
    return [
      {
        // 公开商城页允许桌面端 iframe 手机预览（覆盖下方全局 DENY）
        source: "/shop/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },

  // 对外 URL：proclaw.cc/shop/{store} → 内部仍走 /[store] 动态路由
  async rewrites() {
    return [
      {
        source: "/shop/:store",
        destination: "/:store",
      },
      {
        source: "/shop/:store/:path*",
        destination: "/:store/:path*",
      },
    ];
  },
};

export default nextConfig;
