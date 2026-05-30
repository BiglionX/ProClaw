import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 修复多 lockfile 时的根目录检测
  turbopack: {
    root: import.meta.dirname || process.cwd(),
  },

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
};

export default nextConfig;
