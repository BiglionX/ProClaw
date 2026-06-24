import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 修复多 lockfile 时的根目录检测
  turbopack: {
    root: import.meta.dirname || process.cwd(),
  },

  // Docker 独立部署支持（Vercel 部署时自动忽略）
  output: process.env.NEXT_OUTPUT_MODE === 'standalone' ? 'standalone' : undefined,

  // 图片远程域名白名单 (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "live.staticflickr.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "images.openverse.org",
      },
    ],
  },

  // HTTP Headers 安全配置
  async headers() {
    return [
      {
        // 公开商城页允许桌面端 iframe 手机预览
        source: "/shop/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
      {
        // 管理后台等页面禁止被 iframe 嵌入（商城页走 /shop/* 规则，不含 X-Frame-Options）
        source: "/((?!shop).*)",
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
