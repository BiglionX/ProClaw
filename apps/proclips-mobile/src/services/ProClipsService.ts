/**
 * ProClipsService - ProClips 数据服务（V1 自用版 · Mock 实现）
 *
 * 所有数据均为本地 mock，不依赖后端。Phase 3+ 再接真实 Agent/API。
 * 对应 PRD 3.11 的 video_* 表结构，数据形态与表字段对齐。
 */

import { logger } from '../utils/logger';
import type { PlatformKey } from '../types/navigation';

// ============================================================
// 类型定义
// ============================================================

export interface ProClipsTemplate {
  id: string;
  title: string;
  description: string;
  scenes: string[];
  duration: string;
  sample: string;
  industry?: string;
  badge?: string;
  coverColor?: string; // 占位封面渐变色
}

export interface ProClipsProductInfo {
  name: string;
  features: string[];
  promo: string;
  activeTime: string;
  storeAddress: string;
}

export interface ProClipsSceneUploadResult {
  sceneIndex: number;
  uri: string;
  remoteUrl?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export interface ProClipsMixTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-1
  resultVideoUrl?: string;
  errorMessage?: string;
}

/** 视频库条目（video_final_products） */
export interface VideoItem {
  id: string;
  title: string;
  coverColor: string;
  duration: string;
  isPublic: boolean;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  incentive?: IncentivePlan;
}

/** 素材库条目（达人侧） */
export interface MaterialItem {
  id: string;
  title: string;
  coverColor: string;
  merchant: string;
  merchantLogo: string; // 商家 logo emoji
  industry: string;
  commission: string;
  incentiveTypes: string[];
  hot: number;
  price: string;
  duration: string; // 视频时长，如 "0:32"
  plays: number; // 播放量
  description: string; // 视频简介
  /** 完整激励方案（详情页展示用） */
  incentive?: IncentivePlan;
}

/** 达人侧视频数据追踪条目 */
export interface StatsItem {
  id: string;
  title: string;
  merchant: string;
  coverColor: string;
  plays: number;
  likes: number;
  comments: number;
  orders: number;
  commission: number;
}

/** 平台分享文案（达人发布到平台用） */
export const SHARE_TEXT =
  '🔥 老王火锅店招牌麻辣锅底，本地必吃榜 TOP1！\n#本地美食 #探店 #火锅推荐 #同城美食\n立即抢购：[商品链接]';

/** 推广激励方案（5 种可叠加） */
export interface IncentivePlan {
  cps?: { rate: number; minGuarantee?: number }; // 比例佣金
  fixed?: number; // 固定佣金
  tiered?: Array<{ from: number; to?: number; rate: number }>; // 阶梯佣金
  cpm?: { perThousand: number; cap?: number }; // 播放奖励
  bonus?: { target: number; type: 'orders' | 'views'; amount: number }; // 达标奖金
}

/** 第三方平台账号绑定（video_platform_accounts） */
export interface PlatformAccount {
  platform: PlatformKey;
  platformUid: string;
  platformNickname: string;
  platformAvatar?: string;
  followerCount: number;
  status: 'active' | 'unbound';
  todayViews?: number;
  todayLikes?: number;
  todayComments?: number;
  lastSyncedAt?: string;
}

/** 发布记录（video_publishes） */
export interface PublishRecord {
  id: string;
  videoId: string;
  platform: PlatformKey;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  progress: number;
  platformUrl?: string;
  failReason?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

/** 进行中任务（首页展示） */
export interface TaskItem {
  id: string;
  title: string;
  templateName: string;
  coverColor: string;
  status: 'shooting' | 'mixing' | 'done';
  currentStep: number; // 1..6
  createdAt: string;
}

/** 消息通知图标背景色 key */
export type NotifIcoBg = 'grad' | 'cyan' | 'amber' | 'green' | 'purple';

/** 消息通知 */
export interface NotificationItem {
  id: string;
  /** 细分类型（用于点击跳转不同页面） */
  type: 'xiaoru' | 'video' | 'creator_apply' | 'commission' | 'ip_up' | 'invite';
  /** 大类（用于 Tab 过滤：小如对话 / 系统通知） */
  category: 'xiaoru' | 'system';
  /** 图标字符：emoji 或单字头像（如 '如'） */
  icon: string;
  /** 图标背景色 key */
  icoBg: NotifIcoBg;
  title: string;
  content: string;
  time: string;
  /** 时间分组：'今天' / '昨天' / 自定义 */
  group: string;
  read: boolean;
}

/** 消息通知 Tab 标签 */
export const NOTIF_TABS = ['全部', '小如对话', '系统通知'] as const;
export type NotifTab = (typeof NOTIF_TABS)[number];

/** 按 Tab 过滤通知列表 */
export function filterNotifications(
  list: NotificationItem[],
  tab: NotifTab
): NotificationItem[] {
  if (tab === '小如对话') return list.filter((n) => n.category === 'xiaoru');
  if (tab === '系统通知') return list.filter((n) => n.category === 'system');
  return list;
}

/** 按时间分组通知列表（保持原始顺序） */
export function groupNotifications(
  list: NotificationItem[]
): Array<{ group: string; items: NotificationItem[] }> {
  const map = new Map<string, NotificationItem[]>();
  list.forEach((n) => {
    if (!map.has(n.group)) map.set(n.group, []);
    map.get(n.group)!.push(n);
  });
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

/** 收益记录 */
export interface EarningsRecord {
  id: string;
  videoTitle: string;
  merchant: string;
  amount: number;
  type: 'cps' | 'fixed' | 'cpm' | 'bonus' | 'tiered';
  time: string;
  status: 'settled' | 'pending';
}

/** 人设雷达图维度 */
export interface RadarDimension {
  label: string;
  value: number; // 0-100
}

export interface PersonaRadar {
  role: 'merchant' | 'creator';
  dimensions: RadarDimension[]; // 6 维
  totalScore: number;
  percentile: number; // 超过 N% 同行
}

/** AI 匹配候选（商家选达人 / 达人选视频通用） */
export interface MatchCandidate {
  id: string;
  name: string;
  avatar?: string;
  coverColor: string;
  score: number; // 0-100
  reasons: string[];
  meta: string;
}

// ============================================================
// Phase 4：AI 智能匹配 / IP 助理
// ============================================================

/** 达人候选（商家选达人用） */
export interface CreatorCandidate {
  id: string;
  name: string;
  avatar: string; // 单字头像
  coverColor: string; // 头像背景色
  fans: number;
  fansText: string;
  industry: string;
  region: string;
  gender: '男' | '女';
  rating: number; // 1-5
  style: string;
  orders: number;
  earnings: number;
  tags: string[];
}

/** 素材候选（达人选视频用，扩展自 MaterialItem 增加匹配字段） */
export interface MaterialCandidate {
  id: string;
  title: string;
  merchant: string;
  merchantLogo: string;
  industry: string;
  commission: number; // 百分比
  coverColor: string;
  duration: string;
  description: string;
  priceTier: 'low' | 'mid' | 'high';
  merchantRating: number;
  merchantAge: number;
  goodRate: number;
  difficulty: 'easy' | 'pro';
  merchantRegion: string;
  incentive: IncentivePlan;
}

/** 属性筛选分组配置 */
export interface FilterGroup {
  key: string;
  label: string;
  options: string[];
}

/** 商家选达人 · 7 组属性筛选 */
export const AC_GROUPS: FilterGroup[] = [
  { key: 'fans', label: '粉丝量级', options: ['1k+', '10k+', '100k+', '100w+', '不限'] },
  { key: 'industry', label: '行业偏好', options: ['同行业优先', '跨行业新鲜感', '不限'] },
  { key: 'region', label: '地域', options: ['本地同城', '全国', '北上广深', '不限'] },
  { key: 'gender', label: '性别', options: ['男', '女', '不限'] },
  { key: 'rating', label: '账号口碑', options: ['好评率90%+', '无违规记录', '5星达人', '不限'] },
  { key: 'style', label: '内容风格', options: ['搞笑幽默', '专业测评', '生活化', '种草安利', '探店打卡', '不限'] },
  { key: 'history', label: '历史业绩', options: ['分销过10单+', '佣金收入1000+', '不限'] },
];

/** 达人选视频 · 7 组选品偏好 */
export const AV_GROUPS: FilterGroup[] = [
  { key: 'industry', label: '行业偏好', options: ['餐饮美食', '美发造型', '零售超市', '服装穿搭', '数码科技', '美妆', '母婴', '健身', '不限'] },
  { key: 'commission', label: '佣金比例', options: ['5%+', '10%+', '15%+', '20%+', '不限'] },
  { key: 'incentive', label: '激励类型', options: ['比例佣金', '固定佣金', '阶梯佣金', '播放奖励', '达标奖金', '不限'] },
  { key: 'price', label: '商品价位', options: ['低价(¥50内)', '中价(¥50-500)', '高价(¥500+)', '不限'] },
  { key: 'reputation', label: '商家信誉', options: ['5星商家', '好评率90%+', '老店3年+', '不限'] },
  { key: 'difficulty', label: '推广难度', options: ['轻松上手', '需要专业', '不限'] },
  { key: 'region', label: '地域', options: ['本地商家', '全国可推', '不限'] },
];

/** 商家上下文（用于"同行业/同城"判定） */
export const AC_MERCHANT_CTX = { industry: '餐饮', region: '上海' };
const AC_FOOD_INDUSTRIES = ['餐饮美食', '本地生活'];

/** 达人上下文（用于"同行业/同城"判定） */
export const AC_CREATOR_CTX = { industry: '餐饮美食', region: '上海', fans: 125000 };

const AV_INDUSTRY_MAP: Record<string, string> = {
  餐饮美食: '餐饮', 美发造型: '美发', 零售超市: '零售', 服装穿搭: '服装',
  数码科技: '数码', 美妆: '美妆', 母婴: '母婴', 健身: '健身',
};
function avIndustryShort(label: string): string {
  return AV_INDUSTRY_MAP[label] || label;
}

/** 达人库 mock（10 位） */
export const MOCK_CREATORS: CreatorCandidate[] = [
  { id: 'c1', name: '李小花', avatar: '花', coverColor: '#ff6b9d', fans: 125000, fansText: '12.5w', industry: '餐饮美食', region: '上海', gender: '女', rating: 5, style: '生活化', orders: 32, earnings: 2150, tags: ['5星达人', '美食带货'] },
  { id: 'c2', name: '大胃王阿杰', avatar: '杰', coverColor: '#ffb547', fans: 890000, fansText: '89w', industry: '餐饮美食', region: '北京', gender: '男', rating: 5, style: '搞笑幽默', orders: 156, earnings: 12800, tags: ['5星达人', '头部达人'] },
  { id: 'c3', name: '美发师Tina', avatar: 'T', coverColor: '#a855f7', fans: 83000, fansText: '8.3w', industry: '美发造型', region: '广州', gender: '女', rating: 4, style: '专业测评', orders: 18, earnings: 980, tags: ['4星达人', '垂直专业'] },
  { id: 'c4', name: '探店达人老周', avatar: '周', coverColor: '#22c55e', fans: 450000, fansText: '45w', industry: '本地生活', region: '成都', gender: '男', rating: 5, style: '探店打卡', orders: 89, earnings: 6700, tags: ['5星达人', '探店'] },
  { id: 'c5', name: '种草小仙女', avatar: '仙', coverColor: '#f43f5e', fans: 230000, fansText: '23w', industry: '美妆穿搭', region: '杭州', gender: '女', rating: 5, style: '种草安利', orders: 67, earnings: 4200, tags: ['5星达人', '种草'] },
  { id: 'c6', name: '数码测评师Mike', avatar: 'M', coverColor: '#00d2ff', fans: 1200000, fansText: '120w', industry: '数码科技', region: '深圳', gender: '男', rating: 5, style: '专业测评', orders: 234, earnings: 35000, tags: ['5星达人', '头部达人'] },
  { id: 'c7', name: '宝妈日常分享', avatar: '妈', coverColor: '#fbbf24', fans: 56000, fansText: '5.6w', industry: '母婴亲子', region: '武汉', gender: '女', rating: 4, style: '生活化', orders: 28, earnings: 1680, tags: ['4星达人', '宝妈'] },
  { id: 'c8', name: '健身教练阿力', avatar: '力', coverColor: '#22c3ee', fans: 340000, fansText: '34w', industry: '运动健身', region: '上海', gender: '男', rating: 5, style: '专业测评', orders: 78, earnings: 5800, tags: ['5星达人', '运动'] },
  { id: 'c9', name: '甜点控小美', avatar: '美', coverColor: '#ff6b9d', fans: 67000, fansText: '6.7w', industry: '餐饮美食', region: '广州', gender: '女', rating: 5, style: '种草安利', orders: 41, earnings: 2980, tags: ['5星达人', '美食'] },
  { id: 'c10', name: '潮流探客阿 May', avatar: 'May', coverColor: '#a855f7', fans: 180000, fansText: '18w', industry: '本地生活', region: '上海', gender: '女', rating: 5, style: '探店打卡', orders: 54, earnings: 3620, tags: ['5星达人', '同城'] },
];

/** 素材库 mock（8 条，含匹配字段） */
export const MOCK_MATERIALS_FULL: MaterialCandidate[] = [
  { id: 'm1', title: '老王火锅店·招牌麻辣锅底', merchant: '老王火锅店', merchantLogo: '🍲', industry: '餐饮', commission: 15, coverColor: '#ff6b9d', duration: '0:32', description: '现熬 4 小时牛油锅底，32 味香料秘制，越煮越香。本周末双人套餐 5 折，进店报「老王视频」锅底免单！', priceTier: 'low', merchantRating: 5, merchantAge: 8, goodRate: 0.96, difficulty: 'easy', merchantRegion: '上海', incentive: { cps: { rate: 0.15 } } },
  { id: 'm2', title: '小丽美发沙龙·夏日清凉造型', merchant: '小丽美发沙龙', merchantLogo: '💇', industry: '美发', commission: 12, coverColor: '#a855f7', duration: '0:26', description: '夏日清凉造型来了！资深发型师小丽亲手打造，显脸小又清爽。凭视频到店染烫立减 100 元，再送护理一次。', priceTier: 'mid', merchantRating: 4, merchantAge: 5, goodRate: 0.91, difficulty: 'pro', merchantRegion: '广州', incentive: { cps: { rate: 0.12 }, cpm: { perThousand: 3, cap: 100 } } },
  { id: 'm3', title: '张姐生鲜超市·当季水果特惠', merchant: '张姐生鲜超市', merchantLogo: '🍎', industry: '零售', commission: 10, coverColor: '#22c55e', duration: '0:30', description: '当季水果特惠！阳光玫瑰 9.9/斤，巨峰葡萄 6.9/斤，现摘现卖。今日下单再享 8 折，张姐承诺不甜不要钱。', priceTier: 'low', merchantRating: 5, merchantAge: 3, goodRate: 0.93, difficulty: 'easy', merchantRegion: '上海', incentive: { tiered: [{ from: 1, to: 20, rate: 0.08 }, { from: 21, to: 100, rate: 0.12 }, { from: 101, rate: 0.18 }] } },
  { id: 'm4', title: '潮人衣橱·夏季新款连衣裙', merchant: '潮人衣橱', merchantLogo: '👗', industry: '服装', commission: 18, coverColor: '#f43f5e', duration: '0:28', description: '夏季新款连衣裙上新，显瘦显高显气质。面料亲肤透气，三色可选。视频专属价 129 元，限量 100 件。', priceTier: 'mid', merchantRating: 5, merchantAge: 6, goodRate: 0.94, difficulty: 'easy', merchantRegion: '杭州', incentive: { cps: { rate: 0.18 }, bonus: { target: 30, type: 'orders', amount: 150 } } },
  { id: 'm5', title: '老王火锅店·鲜活切牡蛎', merchant: '老王火锅店', merchantLogo: '🦪', industry: '餐饮', commission: 8, coverColor: '#22c55e', duration: '0:28', description: '鲜活切牡蛎，现刨现涮，海鲜控的福音。配招牌麻辣锅底更绝。视频到店报暗号，牡蛎半价尝鲜。', priceTier: 'low', merchantRating: 5, merchantAge: 8, goodRate: 0.96, difficulty: 'easy', merchantRegion: '上海', incentive: { fixed: 8 } },
  { id: 'm6', title: '数码旗舰店·新品耳机测评', merchant: '数码旗舰店', merchantLogo: '🎧', industry: '数码', commission: 20, coverColor: '#00d2ff', duration: '0:35', description: '年度旗舰耳机深度测评，音质/降噪/续航全面碾压同价位。视频专属优惠券立减 200，7 天无理由试用。', priceTier: 'high', merchantRating: 5, merchantAge: 6, goodRate: 0.95, difficulty: 'pro', merchantRegion: '深圳', incentive: { cps: { rate: 0.2, minGuarantee: 30 } } },
  { id: 'm7', title: '美丽坊·春季美妆套盒', merchant: '美丽坊', merchantLogo: '💄', industry: '美妆', commission: 22, coverColor: '#fbbf24', duration: '0:30', description: '春季美妆套盒，包含粉底+口红+眼影，全套打造春日樱花妆。视频专属价 ¥299，限量 50 套。', priceTier: 'mid', merchantRating: 5, merchantAge: 4, goodRate: 0.94, difficulty: 'easy', merchantRegion: '杭州', incentive: { cps: { rate: 0.22 }, cpm: { perThousand: 5 } } },
  { id: 'm8', title: '老王火锅店·冬日暖锅羊肉煲', merchant: '老王火锅店', merchantLogo: '🍲', industry: '餐饮', commission: 18, coverColor: '#ffb547', duration: '0:35', description: '冬日限定羊肉煲，暖心暖胃。阶梯佣金 10-20%，本季主推，建议立即推广。', priceTier: 'mid', merchantRating: 5, merchantAge: 8, goodRate: 0.96, difficulty: 'easy', merchantRegion: '上海', incentive: { tiered: [{ from: 1, to: 30, rate: 0.1 }, { from: 31, to: 100, rate: 0.15 }, { from: 101, rate: 0.2 }] } },
];

// ============ IP 助理数据 ============

/** IP 维度定义 */
export interface IPDim {
  key: string;
  name: string;
}

export const MERCHANT_DIMS: IPDim[] = [
  { key: 'product', name: '产品力' },
  { key: 'service', name: '服务力' },
  { key: 'creative', name: '创意力' },
  { key: 'activity', name: '活跃度' },
  { key: 'reputation', name: '口碑度' },
  { key: 'conversion', name: '转化力' },
];

export const CREATOR_DIMS: IPDim[] = [
  { key: 'content', name: '内容力' },
  { key: 'affinity', name: '亲和力' },
  { key: 'professional', name: '专业度' },
  { key: 'activity', name: '活跃度' },
  { key: 'influence', name: '影响力' },
  { key: 'conversion', name: '转化力' },
];

export interface IPProfile {
  radar: Record<string, number>;
  ipScore: number;
  percentile: number;
}

export const MERCHANT_PROFILE: IPProfile = {
  radar: { product: 82, service: 75, creative: 62, activity: 70, reputation: 88, conversion: 68 },
  ipScore: 78,
  percentile: 82,
};

export const CREATOR_PROFILE: IPProfile = {
  radar: { content: 72, affinity: 80, professional: 65, activity: 68, influence: 75, conversion: 70 },
  ipScore: 73,
  percentile: 76,
};

export const MERCHANT_ADVICE: Record<string, string> = {
  product: '产品力突出，招牌锅底是核心壁垒。建议拍摄食材溯源、制作工艺内容持续放大优势。',
  service: '服务力良好。建议配置评论区自动回复话术，把平均响应时长压缩到 5 分钟内。',
  creative: '创意力 {v} 分：建议每周发布 2 条创意视频，参考热门模板「招牌菜特写 + 悬念开场」，强化前 3 秒钩子。',
  activity: '活跃度良好。建议固定每周 3 条更新节奏，结合节假日预埋选题。',
  reputation: '口碑度优秀，好评率与复购领先同行。可发放复购券引导老客带新客放大优势。',
  conversion: '转化力 {v} 分：建议在视频末尾强化「进店报老王视频」优惠，并邀请 3 位达人分销扩量。',
};

export const CREATOR_ADVICE: Record<string, string> = {
  content: '内容力良好。建议深耕「探店 + 深度测评」结合的形式，强化个人风格识别度。',
  affinity: '亲和力优秀，互动率高于同行。建议固定回复粉丝评论，强化人设温度。',
  professional: '专业度 {v} 分：建议每周输出 1 条行业知识拆解视频，建立专业人设标签。',
  activity: '活跃度 {v} 分：建议开通直播每周 2 场，提升账号活跃权重与粉丝粘性。',
  influence: '影响力良好。建议联动同领域达人合拍，借势扩大传播半径。',
  conversion: '转化力良好。建议优先选高佣 + 高复购商品重点带货，提升单条 GMV。',
};

export interface GrowthPlanItem {
  ico: string;
  title: string;
  boost: string;
  diff: 1 | 2; // 1 简单 / 2 中等
}

export const MERCHANT_PLAN: GrowthPlanItem[] = [
  { ico: '🎬', title: '本周发布 3 条招牌菜制作过程视频', boost: '创意力 +8 分', diff: 1 },
  { ico: '💬', title: '回复所有评论，互动率提升至 15%+', boost: '服务力 +6 分', diff: 1 },
  { ico: '📡', title: '开通直播，每周 2 场，现场答问+发券', boost: '活跃度 +12 分', diff: 2 },
  { ico: '🤝', title: '邀请 3 位达人分销，设置 15% 佣金', boost: '转化力 +10 分', diff: 2 },
  { ico: '🎫', title: '上线复购券，老客带新客双享优惠', boost: '口碑度 +5 分', diff: 1 },
];

export const CREATOR_PLAN: GrowthPlanItem[] = [
  { ico: '📹', title: '每周发布 2 条深度测评视频', boost: '专业度 +8 分', diff: 1 },
  { ico: '💬', title: '回复所有评论，互动率提升至 15%+', boost: '亲和力 +6 分', diff: 1 },
  { ico: '📡', title: '开通直播，每周 2 场，固定时段', boost: '活跃度 +12 分', diff: 2 },
  { ico: '🤝', title: '联动 3 位同领域达人合拍', boost: '影响力 +10 分', diff: 2 },
  { ico: '💰', title: '挑选高佣商品重点带货，单条聚焦', boost: '转化力 +9 分', diff: 1 },
];

export const MERCHANT_TREND = [68, 70, 72, 73, 76, 78];
export const CREATOR_TREND = [65, 66, 69, 70, 72, 73];

// ============ AI 匹配打分函数 ============

function isRealSel(arr: string[]): boolean {
  return arr.length > 0 && !arr.every((x) => x === '不限');
}

/** 商家选达人 · 打分 */
export function scoreCreator(c: CreatorCandidate, sel: Record<string, string[]>): { score: number; reasonParts: string[] } {
  let score = 0;
  const parts: string[] = [];

  // 粉丝量级
  const matchFans = () => {
    const arr = sel.fans || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.some((opt) =>
      (opt === '1k+' && c.fans >= 1000) ||
      (opt === '10k+' && c.fans >= 10000) ||
      (opt === '100k+' && c.fans >= 100000) ||
      (opt === '100w+' && c.fans >= 1000000)
    );
  };
  if (matchFans()) { score += 14; if (isRealSel(sel.fans)) parts.push(`粉丝 ${c.fansText}`); }

  // 行业偏好
  const matchIndustry = () => {
    const arr = sel.industry || [];
    if (!arr.length || arr.includes('不限')) return true;
    const isFood = AC_FOOD_INDUSTRIES.includes(c.industry);
    if (arr.includes('同行业优先')) return isFood;
    if (arr.includes('跨行业新鲜感')) return !isFood;
    return true;
  };
  if (matchIndustry()) { score += 14; if (sel.industry?.includes('同行业优先')) parts.push(`同行业（${c.industry}）`); }

  // 地域
  const matchRegion = () => {
    const arr = sel.region || [];
    if (!arr.length || arr.includes('不限') || arr.includes('全国')) return true;
    if (arr.includes('本地同城')) return c.region === AC_MERCHANT_CTX.region;
    if (arr.includes('北上广深')) return ['北京', '上海', '广州', '深圳'].includes(c.region);
    return true;
  };
  if (matchRegion()) {
    score += 14;
    if (sel.region?.includes('本地同城')) parts.push(`同城达人（${c.region}）`);
    else if (sel.region?.includes('北上广深') && ['北京', '上海', '广州', '深圳'].includes(c.region)) parts.push(`一线城市（${c.region}）`);
  }

  // 性别
  const matchGender = () => {
    const arr = sel.gender || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.includes(c.gender);
  };
  if (matchGender()) { score += 14; if (isRealSel(sel.gender)) parts.push(`${c.gender}达人`); }

  // 账号口碑
  const matchRating = () => {
    const arr = sel.rating || [];
    if (!arr.length || arr.includes('不限')) return true;
    if (arr.includes('5星达人')) return c.rating === 5;
    if (arr.includes('好评率90%+')) return c.rating >= 4;
    if (arr.includes('无违规记录')) return true;
    return true;
  };
  if (matchRating()) { score += 14; if (sel.rating?.includes('5星达人') && c.rating === 5) parts.push('5星好评'); }

  // 内容风格
  const matchStyle = () => {
    const arr = sel.style || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.includes(c.style);
  };
  if (matchStyle()) { score += 14; if (isRealSel(sel.style)) parts.push(`偏${c.style}`); }

  // 历史业绩
  const matchHistory = () => {
    const arr = sel.history || [];
    if (!arr.length || arr.includes('不限')) return true;
    if (arr.includes('分销过10单+')) return c.orders >= 10;
    if (arr.includes('佣金收入1000+')) return c.earnings >= 1000;
    return true;
  };
  if (matchHistory()) { score += 14; if (isRealSel(sel.history)) parts.push(`历史分销 ${c.orders}单`); }

  // 业绩加分
  if (c.orders >= 50) score += 1;
  if (c.earnings >= 5000) score += 1;
  score = Math.min(100, score);
  return { score, reasonParts: parts };
}

export function buildCreatorReason(c: CreatorCandidate, parts: string[]): string {
  const conv = Math.min(35, Math.max(5, Math.round(c.orders / 10) + 5));
  const tail = `历史转化率 ${conv}%`;
  if (parts.length === 0) return `综合匹配良好，${tail}`;
  return parts.slice(0, 3).join(' + ') + ' + ' + tail;
}

/** 商家选达人 · 计算匹配列表 */
export function computeCreatorMatches(sel: Record<string, string[]>): Array<CreatorCandidate & { _score: number; _reason: string }> {
  const scored = MOCK_CREATORS.map((c) => {
    const r = scoreCreator(c, sel);
    return { ...c, _score: r.score, _reason: buildCreatorReason(c, r.reasonParts) };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

/** 达人选视频 · 打分 */
export function scoreVideo(m: MaterialCandidate, sel: Record<string, string[]>, avg: number): { score: number; reasonParts: string[] } {
  let score = 0;
  const parts: string[] = [];
  const rate = m.commission || 0;

  // 行业偏好
  const matchIndustry = () => {
    const arr = sel.industry || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.map(avIndustryShort).includes(m.industry);
  };
  if (matchIndustry()) {
    score += 14;
    if (isRealSel(sel.industry)) {
      if (avIndustryShort(AC_CREATOR_CTX.industry) === m.industry) parts.push(`同行业${m.industry}`);
      else parts.push(`${m.industry}行业`);
    }
  }

  // 佣金比例
  const matchCommission = () => {
    const arr = sel.commission || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.some((opt) =>
      (opt === '5%+' && rate >= 5) ||
      (opt === '10%+' && rate >= 10) ||
      (opt === '15%+' && rate >= 15) ||
      (opt === '20%+' && rate >= 20)
    );
  };
  if (matchCommission()) { score += 14; if (isRealSel(sel.commission)) parts.push(`佣金 ${rate}%${rate > avg ? ' 高于均值' : ''}`); }

  // 激励类型
  const matchIncentive = () => {
    const arr = sel.incentive || [];
    if (!arr.length || arr.includes('不限')) return true;
    const inc = m.incentive;
    return arr.some((opt) =>
      (opt === '比例佣金' && inc.cps) ||
      (opt === '固定佣金' && inc.fixed) ||
      (opt === '阶梯佣金' && inc.tiered) ||
      (opt === '播放奖励' && inc.cpm) ||
      (opt === '达标奖金' && inc.bonus)
    );
  };
  if (matchIncentive()) {
    score += 14;
    if (isRealSel(sel.incentive)) {
      const arr = sel.incentive;
      const inc = m.incentive;
      const labels: string[] = [];
      if (arr.includes('比例佣金') && inc.cps) labels.push('CPS');
      if (arr.includes('固定佣金') && inc.fixed) labels.push('固定');
      if (arr.includes('阶梯佣金') && inc.tiered) labels.push('阶梯');
      if (arr.includes('播放奖励') && inc.cpm) labels.push('CPM');
      if (arr.includes('达标奖金') && inc.bonus) labels.push('奖金');
      if (labels.length) parts.push(labels.join('+') + '激励');
    }
  }

  // 商品价位
  const matchPrice = () => {
    const arr = sel.price || [];
    if (!arr.length || arr.includes('不限')) return true;
    const map: Record<string, string> = { '低价(¥50内)': 'low', '中价(¥50-500)': 'mid', '高价(¥500+)': 'high' };
    return arr.some((opt) => map[opt] === m.priceTier);
  };
  if (matchPrice()) { score += 14; if (isRealSel(sel.price)) parts.push(priceLabel(m.priceTier) + '商品'); }

  // 商家信誉
  const matchReputation = () => {
    const arr = sel.reputation || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.some((opt) =>
      (opt === '5星商家' && m.merchantRating === 5) ||
      (opt === '好评率90%+' && m.goodRate >= 0.9) ||
      (opt === '老店3年+' && m.merchantAge >= 3)
    );
  };
  if (matchReputation()) {
    score += 14;
    if (isRealSel(sel.reputation)) {
      const arr = sel.reputation;
      if (arr.includes('5星商家') && m.merchantRating === 5) parts.push('5星商家');
      else if (arr.includes('好评率90%+') && m.goodRate >= 0.9) parts.push(`好评率${Math.round(m.goodRate * 100)}%`);
      else if (arr.includes('老店3年+') && m.merchantAge >= 3) parts.push(`${m.merchantAge}年老店`);
    }
  }

  // 推广难度
  const matchDifficulty = () => {
    const arr = sel.difficulty || [];
    if (!arr.length || arr.includes('不限')) return true;
    return arr.some((opt) =>
      (opt === '轻松上手' && m.difficulty === 'easy') ||
      (opt === '需要专业' && m.difficulty === 'pro')
    );
  };
  if (matchDifficulty()) { score += 14; if (isRealSel(sel.difficulty)) parts.push(difficultyLabel(m.difficulty)); }

  // 地域
  const matchRegion = () => {
    const arr = sel.region || [];
    if (!arr.length || arr.includes('不限') || arr.includes('全国可推')) return true;
    if (arr.includes('本地商家')) return m.merchantRegion === AC_CREATOR_CTX.region;
    return true;
  };
  if (matchRegion()) { score += 14; if (sel.region?.includes('本地商家')) parts.push(`同城商家（${m.merchantRegion}）`); }

  // 佣金高于均值加分
  if (rate > avg) score += 2;
  score = Math.min(100, score);
  return { score, reasonParts: parts };
}

export function priceLabel(tier: string): string {
  if (tier === 'low') return '低价';
  if (tier === 'mid') return '中价';
  if (tier === 'high') return '高价';
  return tier;
}

export function difficultyLabel(d: string): string {
  if (d === 'easy') return '轻松上手';
  if (d === 'pro') return '需要专业';
  return d;
}

export function buildVideoReason(m: MaterialCandidate, parts: string[]): string {
  if (parts.length === 0) return '综合匹配良好，建议优先推广';
  return parts.slice(0, 3).join(' + ');
}

/** 达人选视频 · 计算匹配列表 */
export function computeVideoMatches(sel: Record<string, string[]>): Array<MaterialCandidate & { _score: number; _reason: string }> {
  const rates = MOCK_MATERIALS_FULL.map((m) => m.commission || 0);
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const scored = MOCK_MATERIALS_FULL.map((m) => {
    const r = scoreVideo(m, sel, avg);
    return { ...m, _score: r.score, _reason: buildVideoReason(m, r.reasonParts) };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

/** 激励摘要文案 */
export function incentiveSummary(inc: IncentivePlan): string {
  const tags: string[] = [];
  if (inc.cps) tags.push(`CPS ${Math.round(inc.cps.rate * 100)}%`);
  if (inc.fixed) tags.push(`固定 ¥${inc.fixed}`);
  if (inc.tiered) tags.push('阶梯');
  if (inc.cpm) tags.push(`CPM ¥${inc.cpm.perThousand}/k`);
  if (inc.bonus) tags.push(`奖金 ¥${inc.bonus.amount}`);
  return tags.length === 0 ? '未设激励' : tags.join(' + ');
}

/** 小如记忆条目 */
export interface XiaoruMemoryItem {
  id: string;
  category: 'preference' | 'business' | 'persona' | 'history';
  content: string;
  time: string;
}

// ============================================================
// Mock 数据
// ============================================================

export const TEMPLATES: ProClipsTemplate[] = [
  {
    id: 'tpl_1',
    title: '招牌菜探店种草',
    description: '适用于菜品展示与门店氛围的探店种草短视频。',
    scenes: ['开场口播', '菜品特写', '环境展示', '优惠信息', '结尾促单'],
    duration: '30s',
    sample: '适合餐饮、火锅、甜品等门店宣传。',
    industry: '餐饮',
    badge: '🔥 热门',
    coverColor: '#ff6b9d',
  },
  {
    id: 'tpl_2',
    title: '门店活动引流',
    description: '适用于门店活动、促销引流的短视频模板。',
    scenes: ['活动主题', '门店展示', '优惠详情', '行动号召'],
    duration: '25s',
    sample: '适合零售、餐饮、美业活动推广。',
    industry: '零售',
    badge: 'NEW',
    coverColor: '#a855f7',
  },
  {
    id: 'tpl_3',
    title: '美业门店宣传',
    description: '适用于美发/美甲/美容门店的个人 IP 营销短视频。',
    scenes: ['店铺介绍', '服务展示', '效果前后', '优惠卡片'],
    duration: '20s',
    sample: '适合美发、美容、SPA 等商家。',
    industry: '美业',
    coverColor: '#00d2ff',
  },
  {
    id: 'tpl_4',
    title: '零售热销爆款',
    description: '适用于商品展示、推荐理由和购买引导的视频模板。',
    scenes: ['商品展示', '核心卖点', '使用场景', '结尾促单'],
    duration: '15s',
    sample: '适合零售、小商品、快消品推广。',
    industry: '零售',
    coverColor: '#ffb547',
  },
  {
    id: 'tpl_5',
    title: '海鲜上新种草',
    description: '海鲜类新品上市种草模板，突出鲜活与品质。',
    scenes: ['鲜活展示', '烹饪过程', '成品特写', '优惠信息'],
    duration: '30s',
    sample: '适合海鲜、生鲜、餐饮上新。',
    industry: '餐饮',
    coverColor: '#22c55e',
  },
  {
    id: 'tpl_6',
    title: '生活服务推荐',
    description: '生活服务类门店推荐模板。',
    scenes: ['服务介绍', '环境展示', '客户评价', '优惠引导'],
    duration: '25s',
    sample: '适合家政、维修、教培等服务。',
    industry: '服务',
    coverColor: '#f43f5e',
  },
];

export const getTemplateById = (templateId: string): ProClipsTemplate | undefined =>
  TEMPLATES.find((t) => t.id === templateId);

/** 商家视频库 mock */
export const MOCK_VIDEOS: VideoItem[] = [
  {
    id: 'vid_1',
    title: '招牌麻辣锅底 · 探店种草',
    coverColor: '#ff6b9d',
    duration: '32s',
    isPublic: true,
    viewCount: 1280,
    shareCount: 86,
    createdAt: '2026-06-26',
    incentive: { cps: { rate: 15, minGuarantee: 10 }, cpm: { perThousand: 10, cap: 500 } },
  },
  {
    id: 'vid_2',
    title: '鲜活切牡蛎 · 海鲜上新',
    coverColor: '#22c55e',
    duration: '28s',
    isPublic: true,
    viewCount: 860,
    shareCount: 54,
    createdAt: '2026-06-24',
    incentive: { fixed: 20, bonus: { target: 100, type: 'orders', amount: 500 } },
  },
  {
    id: 'vid_3',
    title: '万达店周年庆 · 5 折活动',
    coverColor: '#a855f7',
    duration: '25s',
    isPublic: false,
    viewCount: 0,
    shareCount: 0,
    createdAt: '2026-06-28',
  },
  {
    id: 'vid_4',
    title: '冬日暖锅 · 羊肉煲上市',
    coverColor: '#ffb547',
    duration: '30s',
    isPublic: true,
    viewCount: 2100,
    shareCount: 142,
    createdAt: '2026-06-20',
    incentive: { tiered: [{ from: 1, to: 10, rate: 10 }, { from: 11, to: 50, rate: 15 }, { from: 51, rate: 20 }] },
  },
];

/** 进行中任务 mock */
export const MOCK_TASKS: TaskItem[] = [
  {
    id: 'task_1',
    title: '招牌麻辣锅底 · 探店种草',
    templateName: '招牌菜探店种草',
    coverColor: '#ff6b9d',
    status: 'shooting',
    currentStep: 2,
    createdAt: '今日 14:20 创建',
  },
  {
    id: 'task_2',
    title: '鲜活切牡蛎 · 海鲜上新',
    templateName: '海鲜上新种草',
    coverColor: '#22c55e',
    status: 'mixing',
    currentStep: 5,
    createdAt: '已提交混剪 · 预计 2 分钟',
  },
];

/** 达人素材库 mock */
export const MOCK_MATERIALS: MaterialItem[] = [
  {
    id: 'mat_1', title: '招牌麻辣锅底探店', coverColor: '#ff6b9d',
    merchant: '老王火锅店', merchantLogo: '🍲', industry: '餐饮',
    commission: '15%+¥10', incentiveTypes: ['CPS', 'CPM'],
    hot: 980, price: '¥98/双人餐', duration: '0:32', plays: 12800,
    description: '老王火锅店招牌麻辣锅底，本地必吃榜 TOP1。本视频带你探店实拍，从锅底熬制到招牌菜品一一展示，舌尖上的麻辣鲜香扑面而来，搭配双人套餐限时特惠，转化率超高。',
    incentive: {
      cps: { rate: 0.15, minGuarantee: 10 },
      cpm: { perThousand: 8, cap: 200 },
    },
  },
  {
    id: 'mat_2', title: '鲜活切牡蛎上新', coverColor: '#22c55e',
    merchant: '海味鲜', merchantLogo: '🦪', industry: '餐饮',
    commission: '¥20/单', incentiveTypes: ['固定', '达标奖金'],
    hot: 760, price: '¥58/份', duration: '0:28', plays: 9200,
    description: '海味鲜新鲜到店鲜活切牡蛎，海鲜控必入！原产地直采，个大肥美，鲜甜多汁。达人推广固定佣金 20 元/单，达成 50 单额外奖金 500 元。',
    incentive: {
      fixed: 20,
      bonus: { target: 50, type: 'orders', amount: 500 },
    },
  },
  {
    id: 'mat_3', title: '冬日暖锅羊肉煲', coverColor: '#ffb547',
    merchant: '老王火锅店', merchantLogo: '🍲', industry: '餐饮',
    commission: '阶梯10-20%', incentiveTypes: ['阶梯'],
    hot: 1320, price: '¥128/锅', duration: '0:35', plays: 18600,
    description: '冬日限定羊肉煲，暖心暖胃。阶梯佣金：1-30 单 10%，31-100 单 15%，100+ 单 20%。视频已验证爆款，本季主推，建议立即推广。',
    incentive: {
      tiered: [
        { from: 1, to: 30, rate: 0.1 },
        { from: 31, to: 100, rate: 0.15 },
        { from: 101, rate: 0.2 },
      ],
    },
  },
  {
    id: 'mat_4', title: '美甲新品上架', coverColor: '#a855f7',
    merchant: '指尖艺术', merchantLogo: '💅', industry: '美业',
    commission: '25%', incentiveTypes: ['CPS'],
    hot: 540, price: '¥168/次', duration: '0:30', plays: 6800,
    description: '指尖艺术春季新款美甲上架，时尚设计 + 高端护理。25% 高佣金 CPS 模式，单笔订单 ¥168 起，客单价高，适合美妆时尚类达人推广。',
    incentive: { cps: { rate: 0.25 } },
  },
  {
    id: 'mat_5', title: '零售爆款纸巾', coverColor: '#00d2ff',
    merchant: '实惠百货', merchantLogo: '🛒', industry: '零售',
    commission: '¥5/单', incentiveTypes: ['固定'],
    hot: 420, price: '¥29.9/箱', duration: '0:25', plays: 5200,
    description: '实惠百货爆款纸巾整箱装，超值家用。固定佣金 5 元/单，转化门槛低，复购率高，适合宝妈家庭类账号快速起量。',
    incentive: { fixed: 5 },
  },
  {
    id: 'mat_6', title: '家政深度清洁', coverColor: '#f43f5e',
    merchant: '净家服务', merchantLogo: '🧹', industry: '服务',
    commission: '20%', incentiveTypes: ['CPS', '达标奖金'],
    hot: 310, price: '¥199/次', duration: '0:38', plays: 3800,
    description: '净家服务深度清洁套餐，专业团队上门服务。20% CPS 佣金 + 月销 30 单达标奖金 ¥600。本地生活服务类优质素材，适合本地达人。',
    incentive: {
      cps: { rate: 0.2 },
      bonus: { target: 30, type: 'orders', amount: 600 },
    },
  },
];

/** 达人侧视频数据追踪 mock */
export const MOCK_STATS: StatsItem[] = [
  { id: 's1', title: '冬日暖锅羊肉煲', merchant: '老王火锅店', coverColor: '#ffb547', plays: 18600, likes: 1240, comments: 86, orders: 42, commission: 580 },
  { id: 's2', title: '招牌麻辣锅底探店', merchant: '老王火锅店', coverColor: '#ff6b9d', plays: 12800, likes: 960, comments: 72, orders: 36, commission: 420 },
  { id: 's3', title: '鲜活切牡蛎上新', merchant: '海味鲜', coverColor: '#22c55e', plays: 9200, likes: 580, comments: 38, orders: 28, commission: 360 },
  { id: 's4', title: '美甲新品上架', merchant: '指尖艺术', coverColor: '#a855f7', plays: 6800, likes: 420, comments: 26, orders: 12, commission: 240 },
];

/** 第三方平台账号 mock（4/6 已绑定） */
export const MOCK_PLATFORM_ACCOUNTS: PlatformAccount[] = [
  { platform: 'douyin', platformUid: 'dy_001', platformNickname: '老王火锅店官方号', followerCount: 56800, status: 'active', todayViews: 3200, todayLikes: 286, todayComments: 42, lastSyncedAt: '10 分钟前' },
  { platform: 'kuaishou', platformUid: 'ks_001', platformNickname: '老王火锅·快手', followerCount: 12400, status: 'active', todayViews: 860, todayLikes: 72, todayComments: 15, lastSyncedAt: '1 小时前' },
  { platform: 'xiaohongshu', platformUid: 'xhs_001', platformNickname: '老王的美食日记', followerCount: 32100, status: 'active', todayViews: 1800, todayLikes: 240, todayComments: 38, lastSyncedAt: '30 分钟前' },
  { platform: 'bilibili', platformUid: 'bili_001', platformNickname: '老王吃火锅', followerCount: 8600, status: 'active', todayViews: 420, todayLikes: 56, todayComments: 9, lastSyncedAt: '2 小时前' },
];

// ============================================================
// Phase 6：第三方平台 / OAuth / 发布状态 / 激励设置
// ============================================================

/** 平台元信息（6 个平台，含渐变色和主色） */
export interface PlatformDef {
  key: PlatformKey;
  name: string;
  char: string; // 单字图标
  grad: [string, string]; // 渐变色
  main: string; // 主色
}

export const PLATFORM_DEFS: PlatformDef[] = [
  { key: 'douyin', name: '抖音', char: '抖', grad: ['#1a1a1a', '#444444'], main: '#000000' },
  { key: 'kuaishou', name: '快手', char: '快', grad: ['#ff8a00', '#ff5500'], main: '#FF6600' },
  { key: 'xiaohongshu', name: '小红书', char: '红', grad: ['#ff4e6a', '#ff2e4d'], main: '#FF2E4D' },
  { key: 'wechat_video', name: '视频号', char: '视', grad: ['#07c160', '#06ad56'], main: '#07C160' },
  { key: 'bilibili', name: 'B站', char: 'B', grad: ['#23ade5', '#00A1D6'], main: '#00A1D6' },
  { key: 'weibo', name: '微博', char: '微', grad: ['#ff9248', '#ff8200'], main: '#FF8200' },
];

export function getPlatformDef(key: PlatformKey): PlatformDef | undefined {
  return PLATFORM_DEFS.find((p) => p.key === key);
}

/** OAuth 权限配置（5 项，第 5 项可选） */
export interface OAuthPerm {
  t: string;
  d: string;
  optional?: boolean;
}

export const OAUTH_PERMS: OAuthPerm[] = [
  { t: '发布视频到你的账号', d: '允许 ProClips 代你发布短视频' },
  { t: '读取账号数据', d: '播放、点赞、评论等公开数据' },
  { t: '管理视频评论', d: '查看与回复视频下的评论' },
  { t: '获取账号粉丝信息', d: '粉丝画像与增长趋势' },
  { t: '管理账号消息', d: '读取平台私信与通知', optional: true },
];

/** 激励配置（5 种，每种含 enabled 开关） */
export interface IncentiveConfig {
  cps: { enabled: boolean; rate: number; minGuarantee?: number };
  fixed: { enabled: boolean; amount: number };
  tiered: { enabled: boolean; tiers: Array<{ min: number; max: number; rate: number }> };
  cpm: { enabled: boolean; per1k: number; cap?: number };
  bonus: { enabled: boolean; type: 'orders' | 'plays'; threshold: number; amount: number };
}

export function defaultIncentive(): IncentiveConfig {
  return {
    cps: { enabled: true, rate: 15, minGuarantee: 0 },
    fixed: { enabled: false, amount: 0 },
    tiered: { enabled: false, tiers: [
      { min: 1, max: 30, rate: 10 },
      { min: 31, max: 100, rate: 15 },
      { min: 101, max: 9999, rate: 20 },
    ]},
    cpm: { enabled: false, per1k: 0, cap: 0 },
    bonus: { enabled: false, type: 'orders', threshold: 0, amount: 0 },
  };
}

/** 激励摘要文案（用于预览） */
export function incentiveConfigSummary(inc: IncentiveConfig): string[] {
  const tags: string[] = [];
  if (inc.cps.enabled) tags.push(`CPS ${inc.cps.rate}%${inc.cps.minGuarantee ? ` 保底¥${inc.cps.minGuarantee}` : ''}`);
  if (inc.fixed.enabled) tags.push(`固定 ¥${inc.fixed.amount}/单`);
  if (inc.tiered.enabled) {
    const t = inc.tiered.tiers;
    tags.push(`阶梯 ${t[0]?.rate ?? 0}-${t[t.length - 1]?.rate ?? 0}%`);
  }
  if (inc.cpm.enabled) tags.push(`CPM ¥${inc.cpm.per1k}/千次${inc.cpm.cap ? ` 封顶¥${inc.cpm.cap}` : ''}`);
  if (inc.bonus.enabled) {
    const typ = inc.bonus.type === 'orders' ? '订单' : '播放';
    tags.push(`${typ}≥${inc.bonus.threshold} 奖¥${inc.bonus.amount}`);
  }
  return tags;
}

/** 发布状态条目 */
export interface PublishStatusItem {
  key: PlatformKey;
  name: string;
  char: string;
  grad: [string, string];
  status: 'loading' | 'success' | 'fail';
  progress: number; // 0-100
  plays: number;
  likes: number;
  link: string;
  failReason?: string;
}

/** 根据选中平台生成初始发布状态（mock：视频号 loading，其他 success，B站 fail 演示） */
export function buildInitialPublishStatus(keys: PlatformKey[]): PublishStatusItem[] {
  const preset: Partial<Record<PlatformKey, { plays: number; likes: number }>> = {
    douyin: { plays: 1256, likes: 89 },
    xiaohongshu: { plays: 680, likes: 45 },
    weibo: { plays: 320, likes: 12 },
    kuaishou: { plays: 0, likes: 0 },
    bilibili: { plays: 0, likes: 0 },
    wechat_video: { plays: 0, likes: 0 },
  };
  return keys.map((k, i) => {
    const def = getPlatformDef(k);
    if (!def) {
      return { key: k, name: k, char: '?', grad: ['#333', '#666'] as [string, string], status: 'fail' as const, progress: 0, plays: 0, likes: 0, link: '', failReason: '平台未识别' };
    }
    // 第一个平台 loading（演示进度），第三个平台 fail（演示重试），其余 success
    let status: 'loading' | 'success' | 'fail' = 'success';
    if (i === 0) status = 'loading';
    else if (i === 2) status = 'fail';
    if (status === 'loading') {
      return { key: def.key, name: def.name, char: def.char, grad: def.grad, status, progress: 65, plays: 0, likes: 0, link: '' };
    }
    if (status === 'fail') {
      return { key: def.key, name: def.name, char: def.char, grad: def.grad, status, progress: 100, plays: 0, likes: 0, link: '', failReason: '网络超时，请重试' };
    }
    const ps = preset[k] || { plays: Math.round(200 + Math.random() * 500), likes: Math.round(20 + Math.random() * 60) };
    const link = `https://${def.key}.com/v/${Math.random().toString(36).slice(2, 8)}`;
    return { key: def.key, name: def.name, char: def.char, grad: def.grad, status, progress: 100, plays: ps.plays, likes: ps.likes, link };
  });
}

/** 消息通知 mock（对齐原型 page-notifications，10 条） */
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  // ---- 今天 ----
  { id: 'n1', type: 'xiaoru', category: 'xiaoru', icon: '如', icoBg: 'grad', title: '小如', content: '老板，视频推广数据已出炉，ROI 320%，要不要再邀 1-2 位达人？', time: '刚刚', group: '今天', read: false },
  { id: 'n2', type: 'xiaoru', category: 'xiaoru', icon: '如', icoBg: 'grad', title: '小如', content: '记得你偏爱短视频，已为你筛出 3 个 15-30 秒模板。', time: '15 分钟前', group: '今天', read: false },
  { id: 'n3', type: 'xiaoru', category: 'xiaoru', icon: '如', icoBg: 'grad', title: '小如', content: 'IP 创意力 62 分是短板，建议本周发 3 条招牌菜视频。', time: '1 小时前', group: '今天', read: false },
  { id: 'n4', type: 'video', category: 'system', icon: '🎬', icoBg: 'cyan', title: '视频混剪完成', content: '「招牌麻辣锅底」已就绪，可前往视频库查看。', time: '2 分钟前', group: '今天', read: false },
  { id: 'n5', type: 'creator_apply', category: 'system', icon: '📢', icoBg: 'amber', title: '达人申请推广', content: '达人李小花申请推广你的视频，佣金 15%。', time: '15 分钟前', group: '今天', read: false },
  { id: 'n6', type: 'commission', category: 'system', icon: '💰', icoBg: 'green', title: '佣金到账', content: '¥186（18 单）已结算到账户。', time: '1 小时前', group: '今天', read: true },
  // ---- 昨天 ----
  { id: 'n7', type: 'xiaoru', category: 'xiaoru', icon: '如', icoBg: 'grad', title: '小如', content: '已帮你记下「偏爱短视频」，存入记忆库。', time: '昨天 21:30', group: '昨天', read: false },
  { id: 'n8', type: 'xiaoru', category: 'xiaoru', icon: '如', icoBg: 'grad', title: '小如', content: '周末双人套餐 5 折活动已复盘，带来 18 单。', time: '昨天 18:12', group: '昨天', read: false },
  { id: 'n9', type: 'ip_up', category: 'system', icon: '🎯', icoBg: 'purple', title: 'IP 分提升', content: '78→80，创意力 +2，继续加油！', time: '昨天', group: '昨天', read: true },
  { id: 'n10', type: 'invite', category: 'system', icon: '✅', icoBg: 'green', title: '邀请成功', content: '大胃王阿杰已接受你的推广邀请。', time: '昨天', group: '昨天', read: true },
];

/** 收益记录 mock（达人侧） */
export const MOCK_EARNINGS: EarningsRecord[] = [
  { id: 'e1', videoTitle: '冬日暖锅羊肉煲', merchant: '老王火锅店', amount: 86, type: 'cps', time: '今日 10:24', status: 'settled' },
  { id: 'e2', videoTitle: '招牌麻辣锅底', merchant: '老王火锅店', amount: 50, type: 'fixed', time: '昨日 18:30', status: 'settled' },
  { id: 'e3', videoTitle: '鲜活切牡蛎', merchant: '海味鲜', amount: 120, type: 'bonus', time: '昨日 09:12', status: 'settled' },
  { id: 'e4', videoTitle: '招牌麻辣锅底', merchant: '老王火锅店', amount: 24, type: 'cpm', time: '06-26', status: 'pending' },
  { id: 'e5', videoTitle: '冬日暖锅羊肉煲', merchant: '老王火锅店', amount: 60, type: 'tiered', time: '06-25', status: 'settled' },
  { id: 'e6', videoTitle: '鲜活切牡蛎', merchant: '海味鲜', amount: 40, type: 'fixed', time: '06-24', status: 'settled' },
];

/** 人设雷达图 mock */
export const MOCK_MERCHANT_RADAR: PersonaRadar = {
  role: 'merchant',
  dimensions: [
    { label: '产品力', value: 82 },
    { label: '服务力', value: 75 },
    { label: '创意力', value: 68 },
    { label: '活跃度', value: 71 },
    { label: '口碑度', value: 86 },
    { label: '转化力', value: 64 },
  ],
  totalScore: 74,
  percentile: 81,
};

export const MOCK_CREATOR_RADAR: PersonaRadar = {
  role: 'creator',
  dimensions: [
    { label: '内容力', value: 78 },
    { label: '亲和力', value: 85 },
    { label: '专业度', value: 72 },
    { label: '活跃度', value: 80 },
    { label: '影响力', value: 66 },
    { label: '转化力', value: 70 },
  ],
  totalScore: 75,
  percentile: 78,
};

/** AI 匹配候选 mock（商家选达人） */
export const MOCK_AI_CREATORS: MatchCandidate[] = [
  { id: 'c1', name: '美食小花的探店日记', coverColor: '#ff6b9d', score: 92, reasons: ['同城美食达人', '粉丝量匹配', '口碑 4.9', '风格契合'], meta: '12.5w 粉丝 · 餐饮 · 本地' },
  { id: 'c2', name: '海味鲜推荐官', coverColor: '#22c55e', score: 86, reasons: ['海鲜领域专长', '历史 GMV 高', '活跃度高'], meta: '8.6w 粉丝 · 餐饮 · 海鲜' },
  { id: 'c3', name: '本地生活阿强', coverColor: '#ffb547', score: 79, reasons: ['本地流量大', '佣金接受度高'], meta: '5.2w 粉丝 · 本地 · 探店' },
];

/** AI 匹配候选 mock（达人选视频） */
export const MOCK_AI_VIDEOS: MatchCandidate[] = [
  { id: 'v1', name: '招牌麻辣锅底探店', coverColor: '#ff6b9d', score: 94, reasons: ['佣金 15%+保底', '餐饮行业匹配', '视频热度高'], meta: '老王火锅店 · ¥98/双人餐' },
  { id: 'v2', name: '冬日暖锅羊肉煲', coverColor: '#ffb547', score: 88, reasons: ['阶梯佣金高', '季节匹配', '已验证爆款'], meta: '老王火锅店 · ¥128/锅' },
  { id: 'v3', name: '鲜活切牡蛎上新', coverColor: '#22c55e', score: 81, reasons: ['固定佣金', '达标奖金', '海鲜专长契合'], meta: '海味鲜 · ¥58/份' },
];

/** 小如记忆 mock */
export const MOCK_XIAORU_MEMORY: XiaoruMemoryItem[] = [
  { id: 'm1', category: 'preference', content: '老板喜欢被称呼「老王」，沟通风格偏直接', time: '06-20' },
  { id: 'm2', category: 'preference', content: '最关注视频播放量和到店转化', time: '06-21' },
  { id: 'm3', category: 'business', content: '老王火锅店·万达店，主营川渝火锅，招牌麻辣锅底', time: '06-20' },
  { id: 'm4', category: 'business', content: '当前主推双人套餐 5 折活动，周末可用', time: '06-25' },
  { id: 'm5', category: 'persona', content: '人设综合分 74，短板：创意力、转化力', time: '06-27' },
  { id: 'm6', category: 'persona', content: '成长目标：3 个月内综合分提升至 85', time: '06-27' },
  { id: 'm7', category: 'history', content: '曾请求生成火锅探店文案，已生成 3 版', time: '06-26' },
  { id: 'm8', category: 'history', content: '上周询问过达人推荐，已推荐 3 位', time: '06-24' },
];

// ============================================================
// Phase 5：小如 · AI 营销秘书
// ============================================================

/** 小如聊天消息 */
export interface XiaoruMessage {
  who: 'agent' | 'me';
  text: string;
}

/** 小如初始对话（与原型 XIAORU_CHAT_INIT 对应，纯文本 + 换行） */
export const XIAORU_CHAT_INIT: XiaoruMessage[] = [
  {
    who: 'agent',
    text: '老板好！我是小如，你的 AI 营销秘书👋\n我记得你是「老王火锅店」的，最近在推广招牌麻辣锅底视频，目前 IP 分 78 分，创意力是短板。\n有什么我可以帮你的吗？',
  },
  { who: 'me', text: '帮我看看那个视频推广得怎么样了' },
  {
    who: 'agent',
    text: '已经帮你查了📊\n「招牌麻辣锅底」视频已公开 3 天，目前：\n• 播放 1,256 次，点赞 89\n• 2 位达人在推广，带来 18 单\n• 佣金支出 ¥186，ROI 320%\n\n建议：可以再邀请 1-2 位同城美食达人，预计能再带 30+ 单。要我帮你 AI 选达人吗？',
  },
  { who: 'me', text: '好，顺便看看 IP 怎么提升' },
  {
    who: 'agent',
    text: '好的老板！根据你的雷达图，创意力 62 分是最大短板。\n\n推荐 3 个提升方案：\n1. 本周发 3 条招牌菜制作过程视频（创意力 +8）\n2. 尝试悬念开场模板（创意力 +5）\n3. 蹭热点：夏日火锅挑战（创意力 +6）\n\n要我帮你选模板开始创作吗？',
  },
  { who: 'me', text: '先不用，你去记一下我偏爱短视频' },
  {
    who: 'agent',
    text: '已记下✅\n偏好：偏爱短视频（已存入记忆库-个人偏好）\n之后推荐模板时会优先 15-30 秒的短视频。',
  },
];

/** 快捷指令 chips */
export const XIAORU_QUICK_CHIPS = [
  '我的视频表现如何',
  '帮我分析达人推荐',
  'IP 分怎么提升',
  '今日经营数据',
];

/** 小如关键词 mock 回复 */
export function xiaoruReply(q: string): string {
  if (q.includes('视频') || q.includes('表现')) {
    return '记得你最近在推「招牌麻辣锅底」📊\n当前播放 1,256 次、点赞 89、带来 18 单，ROI 320%。\n创意力 62 分是短板，建议加一条悬念开场版，预计播放能涨 40%。';
  }
  if (q.includes('达人')) {
    return '根据你的店铺画像（餐饮/上海/客单¥85），我筛出 3 位高匹配达人：\n• 大胃王阿杰（美食·12w 粉·ROI 高）\n• 上海吃货小分队（同城·8w 粉）\n• 火锅探店老李（垂直·5w 粉）\n要我发邀请吗？';
  }
  if (q.includes('IP')) {
    return '老板，你的 IP 分 78，创意力 62 最弱。\n本周方案：发 3 条招牌菜制作过程视频（+8），蹭夏日火锅挑战（+6）。完成预计 IP 升到 82。';
  }
  if (q.includes('数据') || q.includes('经营')) {
    return '今日经营快报📈\n• 播放 +326，点赞 +24\n• 成交 6 单，GMV ¥510\n• 佣金支出 ¥48\n• IP 分稳定在 78';
  }
  return '收到老板～我已记下这条需求。\n基于你「老王火锅店·万达店」的记忆，我建议先聚焦招牌麻辣锅底的内容沉淀。需要我帮你查什么具体数据吗？';
}

/** 记忆库分组条目 */
export interface MemoryGroupItem {
  k: string;
  v: string;
}
export interface MemoryGroup {
  key: 'pref' | 'biz' | 'ip' | 'hist';
  icon: string;
  title: string;
  items: MemoryGroupItem[];
}

/** 记忆库 4 组分组数据（与原型 MEMORY_GROUPS 对应） */
export const MEMORY_GROUPS: MemoryGroup[] = [
  {
    key: 'pref', icon: '👤', title: '个人偏好', items: [
      { k: '店铺名', v: '老王火锅店·万达店' },
      { k: '行业', v: '餐饮美食' },
      { k: '经营年限', v: '5 年' },
      { k: '推广偏好', v: '偏爱短视频（15-30 秒）' },
      { k: '活跃时段', v: '晚间 18-22 点' },
    ],
  },
  {
    key: 'biz', icon: '🏪', title: '业务信息', items: [
      { k: '招牌商品', v: '麻辣锅底（32 味香料）' },
      { k: '客单价', v: '¥85' },
      { k: '目标客户', v: '周边 3 公里白领' },
      { k: '优惠活动', v: '周末双人套餐 5 折' },
      { k: '店铺地址', v: '上海万达广场 3 楼' },
      { k: '营业时间', v: '11:00-22:00' },
    ],
  },
  {
    key: 'ip', icon: '🎯', title: 'IP 人设', items: [
      { k: '当前 IP 分', v: '78 分（超越 82% 同行）' },
      { k: '雷达图短板', v: '创意力 62 分' },
      { k: '成长方案进度', v: '2/5 项已完成' },
      { k: '待办', v: '本周发 3 条招牌菜视频' },
    ],
  },
  {
    key: 'hist', icon: '💬', title: '历史对话要点', items: [
      { k: '2026-06-27', v: '讨论了麻辣锅底视频推广策略' },
      { k: '2026-06-26', v: '分析了 2 位达人的推广数据' },
      { k: '2026-06-25', v: '建议提升创意力维度' },
      { k: '2026-06-24', v: '记录用户偏爱短视频偏好' },
      { k: '2026-06-23', v: '规划本周 3 条内容选题' },
      { k: '2026-06-22', v: '复盘 ROI 320% 的推广案例' },
      { k: '2026-06-21', v: '确认周末双人套餐活动' },
      { k: '2026-06-20', v: '首次接入小如，建立店铺档案' },
    ],
  },
];

// ============================================================
// 创作流程函数（保留原签名，改为纯 mock，无网络依赖）
// ============================================================

export const generateUploadUrl = async (
  _templateId: string,
  _sceneIndex: number,
  fileName: string
): Promise<{ uploadUrl: string; key: string } | null> => {
  logger.log('[ProClipsService] mock generateUploadUrl:', fileName);
  return { uploadUrl: `mock://upload/${fileName}`, key: `scenes/${fileName}` };
};

export const uploadSceneClip = async (
  _templateId: string,
  sceneIndex: number,
  uri: string,
  _fileName: string
): Promise<{ remoteUrl: string; uri: string }> => {
  logger.log('[ProClipsService] mock uploadSceneClip:', sceneIndex);
  return { remoteUrl: `mock://scene/${sceneIndex}`, uri };
};

export const confirmSceneUpload = async (
  _templateId: string,
  _sceneIndex: number,
  _key: string
): Promise<boolean> => {
  logger.log('[ProClipsService] mock confirmSceneUpload');
  return true;
};

export const generateScript = async (
  template: ProClipsTemplate,
  productInfo: ProClipsProductInfo
): Promise<string> => {
  logger.log('[ProClipsService] mock generateScript');
  const featuresText = productInfo.features.join('、');
  const promoText = productInfo.promo || '限时优惠';
  return `欢迎来到${productInfo.name}！${featuresText}，${promoText}。${template.title}同款，本周末限时优惠，进店报「老王视频」再享专属福利！`;
};

export const submitMixTask = async (
  template: ProClipsTemplate,
  _productInfo: ProClipsProductInfo,
  _script: string,
  _voiceSampleUri?: string,
  _sceneUploads?: Array<{ sceneIndex: number; remoteUrl: string }>
): Promise<ProClipsMixTaskResult> => {
  const taskId = `local_mix_${Date.now()}`;
  logger.log('[ProClipsService] mock submitMixTask:', template.id, taskId);
  return { taskId, status: 'processing', progress: 0 };
};

export const recordVoiceSample = async (
  uri: string,
  _fileName?: string
): Promise<string> => {
  logger.log('[ProClipsService] mock recordVoiceSample');
  return uri;
};

export const getMixTaskStatus = async (
  taskId: string,
  currentProgress = 0
): Promise<Pick<ProClipsMixTaskResult, 'status' | 'progress' | 'resultVideoUrl' | 'errorMessage'>> => {
  if (taskId.startsWith('local_mix_')) {
    const createdAt = Number(taskId.replace('local_mix_', '')) || Date.now();
    const elapsedSeconds = Math.max(0, (Date.now() - createdAt) / 1000);
    const progress = Math.min(1, currentProgress + elapsedSeconds / 30);
    const completed = progress >= 1;
    return {
      status: completed ? 'completed' : 'processing',
      progress,
      resultVideoUrl: completed ? `mock://result/${taskId}.mp4` : undefined,
    };
  }
  return { status: 'processing', progress: currentProgress };
};
