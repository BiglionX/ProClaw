/**
 * ProClips 路由参数类型表
 *
 * 路由结构：
 *   RootStack
 *     ├─ Main（BottomTab：按角色动态切换）
 *     │    ├─ 商家：CreateHome / Videos / Profile
 *     │    └─ 达人：Browse / Earnings / CreatorProfile
 *     └─ Stack 子页面（21 个，对应原型 21 个 page）
 *
 * 用法：
 *   import type { AppScreenProps, AppNavigation } from '../types/navigation';
 *   type Props = AppScreenProps<'ProClipsChat'>;
 *   const navigation = useNavigation<AppNavigation<'ProClipsChat'>>();
 */

import type { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';

// ============ 角色 ============
export type ProClipsRole = 'merchant' | 'creator';

// ============ 商家侧 Tab 路由 ============
export type MerchantTabParamList = {
  CreateHome: undefined; // 创作
  Videos: undefined; // 视频库
  Profile: undefined; // 我的（商家）
};

// ============ 达人侧 Tab 路由 ============
export type CreatorTabParamList = {
  Browse: undefined; // 素材库
  Earnings: undefined; // 收益
  CreatorProfile: undefined; // 我的（达人）
};

// ============ 根 Stack 路由 ============
export type RootStackParamList = {
  // 启动
  Main: undefined;

  // ---- 商家创作流程 ----
  ProClipsChat: undefined; // 与广告主助手对话
  ProClipsTemplateList: undefined; // 模板列表
  ProClipsTemplateDetail: { templateId: string; title?: string };
  ProClipsWorkflow: { templateId: string; title?: string; taskId?: string };
  ProClipsSceneUpload: { templateId: string; title?: string };
  ProClipsProductInfo: { templateId: string; title?: string };
  ProClipsScriptReview: { templateId: string; title?: string };
  ProClipsVoiceSample: undefined;
  ProClipsMixStatus: { taskId?: string };

  // ---- 推广激励 ----
  ProClipsIncentiveSettings: { videoId: string };

  // ---- 第三方平台 ----
  ProClipsPlatforms: undefined;
  ProClipsPlatformOAuth: { platform: PlatformKey; mode?: 'bind' | 'rebind' };
  ProClipsPublishStatus: { videoId: string; platforms?: PlatformKey[] };

  // ---- AI 智能匹配 ----
  ProClipsAICreator: { videoId?: string }; // 商家选达人
  ProClipsAIVideo: undefined; // 达人选视频
  ProClipsIPCoach: undefined; // AI IP 助理

  // ---- 小如秘书 ----
  ProClipsXiaoruChat: undefined;
  ProClipsXiaoruMemory: undefined;

  // ---- 消息通知 ----
  ProClipsNotifications: undefined;

  // ---- 达人侧 Stack ----
  ProClipsMaterialDetail: { materialId: string };
  ProClipsPublishDouyin: { materialId: string; platform?: PlatformKey };
  ProClipsStatsTracking: undefined;
};

// ============ 第三方平台标识 ============
export type PlatformKey =
  | 'douyin'
  | 'kuaishou'
  | 'xiaohongshu'
  | 'wechat_video'
  | 'bilibili'
  | 'weibo';

/** 通用 Navigation 快捷类型 */
export type AppNavigation<R extends keyof RootStackParamList = keyof RootStackParamList> =
  StackNavigationProp<RootStackParamList, R>;

/** 通用 Screen props 快捷类型 */
export type AppScreenProps<R extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, R>;

/** declare global：让 useNavigation() 无需显式泛型也能拿到 RootStackParamList */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
