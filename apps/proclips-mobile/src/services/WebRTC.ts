// WebRTC - Web 平台
// 使用浏览器原生 WebRTC API（避免加载 react-native-webrtc 导致 requireNativeComponent 崩溃）

// RTCPeerConnection: 浏览器全局可用
export const RTCPeerConnection: typeof globalThis.RTCPeerConnection =
  (globalThis as any).RTCPeerConnection ||
  (globalThis as any).webkitRTCPeerConnection ||
  (globalThis as any).mozRTCPeerConnection;

// RTCSessionDescription: 浏览器全局可用
export const RTCSessionDescription: typeof globalThis.RTCSessionDescription =
  (globalThis as any).RTCSessionDescription;

// RTCIceCandidate: 浏览器全局可用
export const RTCIceCandidate: typeof globalThis.RTCIceCandidate =
  (globalThis as any).RTCIceCandidate;

// MediaStream: 浏览器原生类型（使用 any 避免与 react-native-webrtc 类型冲突）
export type MediaStream = any;

// mediaDevices: 浏览器 navigator.mediaDevices
export const mediaDevices = (globalThis as any).navigator?.mediaDevices || null;

// 检测 WebRTC 原生模块是否可用
// Web 平台：基于 RTCPeerConnection 是否定义判断
export const isWebRTCNativeAvailable = (): boolean => {
  return typeof RTCPeerConnection === 'function';
};
