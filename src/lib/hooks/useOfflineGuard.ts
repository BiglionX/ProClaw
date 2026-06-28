/**
 * PRD v13.0 §6：离线访客云端能力拦截 hook
 *
 * 用法：
 *   useOfflineGuard('cloud-backup');  // 进入页面时若离线，自动弹 UpgradeDialog
 *
 * 设计要点（PRD v13.0 实施教训）：
 *   1. 用 authStore.requireUpgradeOpen + 页面级 ref 双重防重弹
 *   2. 仅在 offline / local 身份触发（demo / premium 跳过）
 *   3. 关闭弹窗后不会循环重弹（除非身份状态变化）
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../authStore';
import type { Feature } from '../../components/Auth/RequireUpgrade';

export function useOfflineGuard(feature: Feature) {
  const { identityState, requireUpgradeOpen, openRequireUpgrade, closeRequireUpgrade } = useAuthStore();
  // 本会话已提示：避免 openRequireUpgrade → close → open 死循环
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    if (identityState !== 'offline' && identityState !== 'local') {
      // premium / demo 无需拦截
      hasPromptedRef.current = false;
      return;
    }
    if (hasPromptedRef.current) return;
    if (!requireUpgradeOpen) {
      hasPromptedRef.current = true;
      openRequireUpgrade(feature);
    }
  }, [identityState, requireUpgradeOpen, openRequireUpgrade, feature]);

  // 卸载时关闭弹窗，避免切换页面后弹窗残留
  useEffect(() => {
    return () => {
      if (requireUpgradeOpen) closeRequireUpgrade();
    };
  }, [requireUpgradeOpen, closeRequireUpgrade]);
}