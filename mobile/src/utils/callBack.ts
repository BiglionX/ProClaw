/**
 * 通话回拨工具函数
 * P2 项 3：从 CallHistoryScreen 抽出的纯函数，便于单测覆盖对端解析逻辑
 */

export type CallDirection = 'outgoing' | 'incoming';
export type CallType = 'audio' | 'video';

export interface CallRecordLike {
  caller_id: string;
  callee_id: string;
  caller_name?: string;
  callee_name?: string;
  direction: CallDirection;
  call_type: CallType;
}

/**
 * 根据通话记录推断回拨目标
 * - outgoing（我打出去的）：对方 = callee
 * - incoming（打进来的）：对方 = caller
 * name 缺失时回退到 id
 */
export function resolveCallBackTarget(item: CallRecordLike): {
  userId: string;
  userName: string;
  callType: CallType;
} {
  const isIncoming = item.direction === 'incoming';
  const userId = isIncoming ? item.caller_id : item.callee_id;
  const userName = isIncoming
    ? (item.caller_name || item.caller_id)
    : (item.callee_name || item.callee_id);
  return {
    userId,
    userName,
    callType: item.call_type,
  };
}
