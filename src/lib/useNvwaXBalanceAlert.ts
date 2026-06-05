/**
 * NvwaX Token 余额告警 Hook
 *
 * 监听余额不足事件，显示 Snackbar 提示。
 * 在任意 NvwaX 功能页面中引入即可启动告警监控。
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

import { useState, useEffect, useCallback } from 'react';
import { BALANCE_ALERT_EVENT, BALANCE_WARN_THRESHOLD } from './nvwaxClient';

/** 告警信息 */
export interface BalanceAlertDetail {
  balance: number;
  threshold: number;
  message: string;
}

/** 余额告警状态 */
export interface BalanceAlertState {
  /** 当前余额 */
  balance: number;
  /** 告警阈值 */
  threshold: number;
  /** 告警消息 */
  message: string;
  /** 是否显示告警 */
  show: boolean;
}

/**
 * NvwaX Token 余额告警 Hook
 * @param autoListen 是否自动监听告警事件，默认 true
 */
export function useNvwaXBalanceAlert(autoListen = true) {
  const [alert, setAlert] = useState<BalanceAlertState>({
    balance: 0,
    threshold: BALANCE_WARN_THRESHOLD,
    message: '',
    show: false,
  });

  /** 关闭告警 */
  const dismissAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }));
  }, []);

  /** 监听告警事件 */
  useEffect(() => {
    if (!autoListen) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<BalanceAlertDetail>).detail;
      if (detail) {
        setAlert({
          balance: detail.balance,
          threshold: detail.threshold,
          message: detail.message,
          show: true,
        });
      }
    };

    window.addEventListener(BALANCE_ALERT_EVENT, handler);
    return () => window.removeEventListener(BALANCE_ALERT_EVENT, handler);
  }, [autoListen]);

  return {
    alert,
    dismissAlert,
  };
}
