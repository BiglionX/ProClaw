// WebRTC - Native 平台 (iOS/Android)
// v20: 完全移除 react-native-webrtc 依赖 - 该包 124.0.0 与 RN 0.85 新架构及
//      禁用新架构后的初始化都有兼容性问题，导致 App 启动闪退。
//      此处提供 stub 占位，让上层代码仍然可以 import，但所有调用都会失败。
//      通话功能暂时不可用，但其他核心功能（消息、商品、订单等）不受影响。

import { logger } from '../utils/logger';

// 检测 WebRTC 原生模块是否可用（始终返回 false，因为 v20 已移除）
export const isWebRTCNativeAvailable = (): boolean => {
  return false;
};

// 占位类型与函数 - 调用时抛错或返回 null
class WebRTCUnavailableError extends Error {
  constructor(method: string) {
    super(
      `WebRTC native module has been removed in v20. ` +
      `Method "${method}" is unavailable. ` +
      `Voice/video call features are temporarily disabled.`
    );
    this.name = 'WebRTCUnavailableError';
    logger.warn('[WebRTC.native]', this.message);
  }
}

// RTCPeerConnection 占位
export const RTCPeerConnection: any = function () {
  throw new WebRTCUnavailableError('RTCPeerConnection');
};

// RTCSessionDescription 占位
export const RTCSessionDescription: any = function () {
  throw new WebRTCUnavailableError('RTCSessionDescription');
};

// RTCIceCandidate 占位
export const RTCIceCandidate: any = function () {
  throw new WebRTCUnavailableError('RTCIceCandidate');
};

// MediaStream 占位类型
export type MediaStream = any;

// mediaDevices 占位
export const mediaDevices: any = {
  getUserMedia: () => {
    throw new WebRTCUnavailableError('mediaDevices.getUserMedia');
  },
  enumerateDevices: () => {
    throw new WebRTCUnavailableError('mediaDevices.enumerateDevices');
  },
};
