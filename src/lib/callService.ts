// 通话记录服务
// v4.1: 通话记录 API 客户端 + Tauri 桥接

import { isTauri, safeInvoke } from './tauri';
import apiClient from './apiClient';

export interface CallRecord {
  id: string;
  session_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  status: 'ringing' | 'answered' | 'missed' | 'rejected' | 'busy' | 'ended';
  duration_seconds: number;
  started_at: number | null;
  ended_at: number | null;
  created_at: string;
  caller_name?: string;
  callee_name?: string;
}

/** 获取通话记录列表 */
export async function getCallRecords(params?: {
  user_id?: string;
  contact_id?: string;
  call_type?: string;
  status?: string;
  limit?: number;
}): Promise<CallRecord[]> {
  if (isTauri()) {
    try {
      const result: any = await safeInvoke('get_call_records_cmd', {
        params: {
          user_id: params?.user_id || '',
          contact_id: params?.contact_id || null,
          call_type: params?.call_type || null,
          status: params?.status || null,
          limit: params?.limit || 50,
        },
      });
      return result?.data || [];
    } catch (e) {
      console.error('getCallRecords (Tauri) failed:', e);
      return [];
    }
  }

  // HTTP API fallback
  try {
    const response = await apiClient.get('/api/call-records', { params });
    return response.data.data || [];
  } catch (e) {
    console.error('getCallRecords (HTTP) failed:', e);
    return [];
  }
}

/** 创建通话记录 */
export async function createCallRecord(data: {
  session_id: string;
  caller_id: string;
  callee_id: string;
  call_type: string;
  direction: string;
  status?: string;
  started_at?: number;
}): Promise<any> {
  if (isTauri()) {
    try {
      return await safeInvoke('create_call_record_cmd', { record: data });
    } catch (e) {
      console.error('createCallRecord (Tauri) failed:', e);
    }
  }

  try {
    const response = await apiClient.post('/api/call-records', data);
    return response.data;
  } catch (e) {
    console.error('createCallRecord (HTTP) failed:', e);
  }
}

/** 更新通话记录 */
export async function updateCallRecord(session_id: string, data: {
  status?: string;
  duration_seconds?: number;
  started_at?: number;
  ended_at?: number;
}): Promise<void> {
  if (isTauri()) {
    try {
      await safeInvoke('update_call_record_cmd', { params: { session_id, ...data } });
      return;
    } catch (e) {
      console.error('updateCallRecord (Tauri) failed:', e);
    }
  }

  try {
    await apiClient.put(`/api/call-records/${session_id}`, data);
  } catch (e) {
    console.error('updateCallRecord (HTTP) failed:', e);
  }
}
