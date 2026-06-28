/**
 * 共享类型定义 - 与移动端 ProClipsService.ts 对齐
 */

export type PlatformKey =
  | 'douyin'
  | 'kuaishou'
  | 'xiaohongshu'
  | 'wechat_video'
  | 'bilibili'
  | 'weibo';

export interface ProClipsTemplate {
  id: string;
  title: string;
  description: string;
  scenes: string[];
  duration: string;
  sample: string;
  industry?: string;
  badge?: string;
  coverColor?: string;
}

export interface ProClipsProductInfo {
  name: string;
  features: string[];
  promo?: string;
  activeTime?: string;
  storeAddress?: string;
}

export interface SceneUpload {
  sceneIndex: number;
  fileKey: string;       // 服务端 fileKey（数据库主键）
  remoteUrl: string;     // 服务端拼接的完整 URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSec?: number;
}

export type MixTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProClipsMixTaskResult {
  taskId: string;
  status: MixTaskStatus;
  progress: number; // 0-1
  resultVideoUrl?: string;
  errorMessage?: string;
}

export interface IncentivePlan {
  cps?: { rate: number; minGuarantee?: number };
  fixed?: number;
  tiered?: Array<{ from: number; to?: number; rate: number }>;
  cpm?: { perThousand: number; cap?: number };
  bonus?: { target: number; type: 'orders' | 'views'; amount: number };
}

export interface VideoItem {
  id: string;
  merchantId: string;
  taskId?: string;
  title: string;
  coverColor: string;
  duration: string;
  fileKey: string;
  fileSize?: number;
  isPublic: boolean;
  viewCount: number;
  shareCount: number;
  incentive?: IncentivePlan;
  createdAt: string;
  updatedAt: string;
}

/**
 * JWT Payload（HS256）
 * sub = merchantId（商家 ID），role = merchant / creator
 */
export interface JwtPayload {
  sub: string;
  role: 'merchant' | 'creator';
  iss: string;
  exp?: number;
  iat?: number;
}

/**
 * API 响应统一格式
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}
