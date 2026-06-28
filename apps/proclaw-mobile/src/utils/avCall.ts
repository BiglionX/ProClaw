import { Platform } from 'react-native';
import { isWebRTCNativeAvailable } from '../services/WebRTC';
import { isLiveKitNativeAvailable } from '../services/LiveKitService';
import callManager from '../services/CallManager';
import { showToast } from '../components/Toast';
import type { CallType } from '../stores/CallStore';
import type { AppNavigation } from '../types/navigation';

export const AV_CALL_UNAVAILABLE_MSG =
  '音视频通话需要 Expo Dev Client 构建，且服务端已配置 LiveKit';

export function isAvCallAvailable(): boolean {
  if (Platform.OS === 'web') {
    return typeof globalThis.RTCPeerConnection === 'function';
  }
  return isLiveKitNativeAvailable() || isWebRTCNativeAvailable();
}

export function guardAvCall(): boolean {
  if (isAvCallAvailable()) return true;
  showToast('info', '暂不可用', AV_CALL_UNAVAILABLE_MSG);
  return false;
}

export async function startOutboundAvCall(
  navigation: AppNavigation,
  targetUserId: string,
  targetUserName: string,
  callType: CallType,
): Promise<boolean> {
  if (!guardAvCall()) return false;
  const ok = await callManager.startCall(targetUserId, targetUserName, callType);
  if (ok) {
    navigation.navigate('Call');
  }
  return ok;
}

export function canCallContact(contact: {
  contact_type?: string;
  source?: string;
}): boolean {
  if (contact.contact_type === 'colleague' || contact.contact_type === 'friend') {
    return true;
  }
  return contact.source === 'invitation';
}