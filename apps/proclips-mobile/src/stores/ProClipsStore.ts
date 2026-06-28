/**
 * ProClipsStore - ProClips 全局状态
 *
 * 涵盖：角色切换、创作流程、视频库、素材库、平台账号、消息、人设等。
 * V1 自用版：数据从 ProClipsService 的 mock 加载，后续可替换为真实 API。
 */

import { create } from 'zustand';
import type { ProClipsRole } from '../types/navigation';
import type {
  ProClipsTemplate,
  ProClipsProductInfo,
  ProClipsSceneUploadResult,
  ProClipsMixTaskResult,
  VideoItem,
  MaterialItem,
  PlatformAccount,
  NotificationItem,
  EarningsRecord,
  PersonaRadar,
  TaskItem,
  XiaoruMemoryItem,
  IncentivePlan,
} from '../services/ProClipsService';
import {
  MOCK_VIDEOS,
  MOCK_MATERIALS,
  MOCK_PLATFORM_ACCOUNTS,
  MOCK_NOTIFICATIONS,
  MOCK_EARNINGS,
  MOCK_MERCHANT_RADAR,
  MOCK_CREATOR_RADAR,
  MOCK_TASKS,
  MOCK_XIAORU_MEMORY,
} from '../services/ProClipsService';

// ============ 创作流程状态 ============
export interface CreationFlowState {
  selectedTemplate?: ProClipsTemplate;
  sceneUploads: ProClipsSceneUploadResult[];
  productInfo: ProClipsProductInfo;
  generatedScript: string;
  voiceSampleUri?: string;
  mixTask?: ProClipsMixTaskResult;
}

export interface ProClipsState extends CreationFlowState {
  // 角色
  role: ProClipsRole;
  setRole: (role: ProClipsRole) => void;
  /** 是否正在播放变身动画 */
  transforming: boolean;
  /** 变身动画的源角色与目标角色（动画期间有效） */
  transformFrom: ProClipsRole | null;
  transformTo: ProClipsRole | null;
  /** 启动变身动画：记录 from/to，标记 transforming=true */
  startTransform: (from: ProClipsRole, to: ProClipsRole) => void;
  /** 结束变身动画：清空 from/to，transforming=false */
  endTransform: () => void;

  // 创作流程
  setSelectedTemplate: (template: ProClipsTemplate) => void;
  setSceneUpload: (sceneUpload: ProClipsSceneUploadResult) => void;
  setProductInfo: (productInfo: ProClipsProductInfo) => void;
  setGeneratedScript: (script: string) => void;
  setVoiceSampleUri: (uri?: string) => void;
  setMixTask: (task: ProClipsMixTaskResult) => void;
  resetCreation: () => void;

  // 视频库（商家）
  videos: VideoItem[];
  setVideos: (videos: VideoItem[]) => void;
  /** 设置激励方案并公开 */
  setVideoIncentive: (videoId: string, plan: IncentivePlan) => void;
  /** 设为私密 */
  unpublishVideo: (videoId: string) => void;

  // 进行中任务
  tasks: TaskItem[];

  // 素材库（达人）
  materials: MaterialItem[];

  // 第三方平台
  platformAccounts: PlatformAccount[];
  unbindPlatform: (platform: string) => void;
  bindPlatform: (account: PlatformAccount) => void;

  // 消息通知
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: () => number;

  // 收益（达人）
  earnings: EarningsRecord[];

  // 人设雷达
  merchantRadar: PersonaRadar;
  creatorRadar: PersonaRadar;

  // 小如记忆
  xiaoruMemory: XiaoruMemoryItem[];
  forgetMemory: (id: string) => void;
}

const initialCreation: CreationFlowState = {
  selectedTemplate: undefined,
  sceneUploads: [],
  productInfo: { name: '', features: [], promo: '', activeTime: '', storeAddress: '' },
  generatedScript: '',
  voiceSampleUri: undefined,
  mixTask: undefined,
};

export const useProClipsStore = create<ProClipsState>((set, get) => ({
  // ---- 角色 ----
  role: 'merchant',
  setRole: (role) => set({ role }),
  transforming: false,
  transformFrom: null,
  transformTo: null,
  startTransform: (from, to) => set({ transforming: true, transformFrom: from, transformTo: to }),
  endTransform: () => set({ transforming: false, transformFrom: null, transformTo: null }),

  // ---- 创作流程 ----
  ...initialCreation,
  setSelectedTemplate: (template) =>
    set({
      selectedTemplate: template,
      sceneUploads: [],
      generatedScript: '',
      voiceSampleUri: undefined,
      mixTask: undefined,
    }),
  setSceneUpload: (sceneUpload) =>
    set((state) => ({
      sceneUploads: [
        ...state.sceneUploads.filter((item) => item.sceneIndex !== sceneUpload.sceneIndex),
        sceneUpload,
      ],
    })),
  setProductInfo: (productInfo) => set({ productInfo }),
  setGeneratedScript: (script) => set({ generatedScript: script }),
  setVoiceSampleUri: (uri) => set({ voiceSampleUri: uri }),
  setMixTask: (task) => set({ mixTask: task }),
  resetCreation: () => set({ ...initialCreation }),

  // ---- 视频库 ----
  videos: MOCK_VIDEOS,
  setVideos: (videos) => set({ videos }),
  setVideoIncentive: (videoId, plan) =>
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, incentive: plan, isPublic: true } : v
      ),
    })),
  unpublishVideo: (videoId) =>
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, isPublic: false } : v
      ),
    })),

  // ---- 任务 ----
  tasks: MOCK_TASKS,

  // ---- 素材库 ----
  materials: MOCK_MATERIALS,

  // ---- 平台账号 ----
  platformAccounts: MOCK_PLATFORM_ACCOUNTS,
  unbindPlatform: (platform) =>
    set((state) => ({
      platformAccounts: state.platformAccounts.filter((p) => p.platform !== platform),
    })),
  bindPlatform: (account) =>
    set((state) => ({
      platformAccounts: [
        ...state.platformAccounts.filter((p) => p.platform !== account.platform),
        account,
      ],
    })),

  // ---- 消息通知 ----
  notifications: MOCK_NOTIFICATIONS,
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  // ---- 收益 ----
  earnings: MOCK_EARNINGS,

  // ---- 人设雷达 ----
  merchantRadar: MOCK_MERCHANT_RADAR,
  creatorRadar: MOCK_CREATOR_RADAR,

  // ---- 小如记忆 ----
  xiaoruMemory: MOCK_XIAORU_MEMORY,
  forgetMemory: (id) =>
    set((state) => ({
      xiaoruMemory: state.xiaoruMemory.filter((m) => m.id !== id),
    })),
}));
