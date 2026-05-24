// 通话管理器 - 管理通话生命周期和信令
// v4.1: 音视频通话核心逻辑

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
} from './WebRTC';
import wsService from './WebSocketService';
import { useCallStore, CallType } from '../stores/CallStore';

class CallManager {
  private callTimeout: ReturnType<typeof setTimeout> | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];
  private rtcPeer: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  onStreamChange: (() => void) | null = null;

  /** 初始化通话管理器，注册信令处理器 */
  init() {
    this.unsubscribers.push(
      wsService.on('call_offer', this.handleIncomingOffer.bind(this)),
      wsService.on('call_offer_sent', this.handleOfferSent.bind(this)),
      wsService.on('call_answer', this.handleAnswer.bind(this)),
      wsService.on('call_ice_candidate', this.handleIceCandidate.bind(this)),
      wsService.on('call_hangup', this.handleRemoteHangup.bind(this)),
      wsService.on('call_reject', this.handleReject.bind(this)),
      wsService.on('call_busy', this.handleBusy.bind(this)),
      wsService.on('call_offline', this.handleOffline.bind(this)),
    );
  }

  /** 销毁通话管理器 */
  destroy() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    this.cleanup();
  }

  // ============================================================
  // 发起通话
  // ============================================================

  /** 发起语音/视频通话 */
  async startCall(targetUserId: string, targetUserName: string, callType: CallType): Promise<boolean> {
    const store = useCallStore.getState();

    // 检查是否已在通话中
    if (store.status !== 'idle') {
      Alert.alert('提示', '当前已在通话中，请先结束当前通话');
      return false;
    }

    // 检查权限
    if (!(await this.checkPermissions(callType))) {
      return false;
    }

    // 生成 sessionId
    const sessionId = this.generateSessionId();
    const userId = wsService.currentUserId;

    // 创建 WebRTC PeerConnection
    try {
      await this.createPeerConnection(sessionId, callType, true);
    } catch (e) {
      console.error('[Call] Failed to create peer connection:', e);
      Alert.alert('错误', '无法初始化通话，请检查设备权限');
      return false;
    }

    // 更新状态
    store.startOutgoingCall({
      sessionId,
      remoteUserId: targetUserId,
      remoteUserName: targetUserName,
      callType,
    });

    // 创建 SDP Offer
    const offer = await this.rtcPeer!.createOffer({});
    await this.rtcPeer!.setLocalDescription(offer);

    // 通过 WebSocket 发送 call_offer
    wsService.send('call_offer', {
      sessionId,
      callType,
      callerId: userId,
      calleeId: targetUserId,
      offer: { sdp: offer.sdp, type: offer.type },
    }, targetUserId);

    // 设置超时（30秒）
    this.callTimeout = setTimeout(() => {
      this.handleCallTimeout();
    }, 30000);

    return true;
  }

  // ============================================================
  // 接听 / 拒绝
  // ============================================================

  /** 接听来电 */
  async acceptIncoming(): Promise<void> {
    const store = useCallStore.getState();
    const call = store.incomingCall;
    if (!call) return;

    // 检查权限
    if (!(await this.checkPermissions(call.callType))) {
      return;
    }

    // 创建 PeerConnection
    try {
      await this.createPeerConnection(call.sessionId, call.callType, false);
    } catch (e) {
      console.error('[Call] Failed to create peer connection for answer:', e);
      wsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
      store.setIncomingCall(null);
      return;
    }

    // 创建 SDP Answer
    const answer = await this.rtcPeer!.createAnswer();
    await this.rtcPeer!.setLocalDescription(answer);

    // 发送 call_answer
    wsService.send('call_answer', {
      sessionId: call.sessionId,
      answer: { sdp: answer.sdp, type: answer.type },
    }, call.callerId);

    store.callConnected(call.sessionId);
    store.setIncomingCall(null);
    this.startDurationTimer();
  }

  /** 拒绝来电 */
  rejectIncoming(reason?: string) {
    const store = useCallStore.getState();
    const call = store.incomingCall;
    if (!call) return;

    const msgType = reason === 'busy' ? 'call_busy' : 'call_reject';
    wsService.send(msgType, { sessionId: call.sessionId }, call.callerId);
    store.setIncomingCall(null);
    store.reset();
  }

  /** 挂断当前通话 */
  hangup() {
    const store = useCallStore.getState();
    if (!store.sessionId) return;

    wsService.send('call_hangup', {
      sessionId: store.sessionId,
    }, store.remoteUserId!);

    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
  }

  // ============================================================
  // 媒体控制
  // ============================================================

  toggleMute() {
    const store = useCallStore.getState();
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = store.isMuted;
      }
    }
    store.setMuted(!store.isMuted);
  }

  toggleCamera() {
    const store = useCallStore.getState();
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = store.isCameraOff;
      }
    }
    store.setCameraOff(!store.isCameraOff);
  }

  toggleSpeaker() {
    const store = useCallStore.getState();
    store.setSpeakerOn(!store.isSpeakerOn);
  }

  // ============================================================
  // 信令处理
  // ============================================================

  private async handleIncomingOffer(_type: string, data: any) {
    const payload = data.payload || {};
    const { sessionId, callerId, callType } = payload;

    if (!sessionId) return;

    const callerName = payload.callerName || callerId || '未知用户';

    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      wsService.send('call_busy', { sessionId }, callerId);
      return;
    }

    store.setIncomingCall({
      sessionId,
      callerId: callerId || '',
      callerName,
      callType: callType || 'audio',
    });

    if (payload.offer) {
      this.pendingOffer = payload.offer;
    }

    this.callTimeout = setTimeout(() => {
      const s = useCallStore.getState();
      if (s.status === 'ringing' && s.incomingCall) {
        this.rejectIncoming();
      }
    }, 30000);
  }

  private handleOfferSent(_type: string, _data: any) {
    console.log('[Call] Offer sent successfully');
  }

  private async handleAnswer(_type: string, data: any) {
    const payload = data.payload || {};
    const { sessionId, answer } = payload;

    if (!sessionId || !answer || !this.rtcPeer) return;

    try {
      await this.rtcPeer.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      useCallStore.getState().callConnected(sessionId);
      this.clearCallTimeout();
      this.startDurationTimer();
    } catch (e) {
      console.error('[Call] Failed to set remote SDP:', e);
    }
  }

  private async handleIceCandidate(_type: string, data: any) {
    const payload = data.payload || {};
    const { sessionId, candidate } = payload;

    if (!sessionId || !candidate || !this.rtcPeer) return;

    try {
      await this.rtcPeer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[Call] Failed to add ICE candidate:', e);
    }
  }

  private handleRemoteHangup(_type: string, data: any) {
    const payload = data.payload || {};
    const { sessionId, reason } = payload;
    const store = useCallStore.getState();

    if (store.sessionId !== sessionId) return;

    if (reason === 'answered_elsewhere') {
      store.setIncomingCall(null);
      store.reset();
      Alert.alert('提示', '已在其他设备接听');
    } else {
      this.cleanup();
      store.endCall();
      setTimeout(() => store.reset(), 500);
      if (store.status === 'connected') {
        Alert.alert('提示', '对方已挂断');
      }
    }
  }

  private handleReject(_type: string, data: any) {
    const payload = data.payload || {};
    const store = useCallStore.getState();

    if (store.sessionId !== payload.sessionId) return;

    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
    Alert.alert('提示', '对方拒绝了通话');
  }

  private handleBusy(_type: string, data: any) {
    const payload = data.payload || {};
    const store = useCallStore.getState();

    if (store.sessionId !== payload.sessionId) return;

    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
    Alert.alert('提示', '对方正在通话中');
  }

  private handleOffline(_type: string, data: any) {
    const payload = data.payload || {};
    const store = useCallStore.getState();

    if (store.sessionId !== payload.sessionId) return;

    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
    Alert.alert('提示', payload.message || '对方不在线，无法接通');
  }

  // ============================================================
  // WebRTC 辅助
  // ============================================================

  private pendingOffer: any = null;

  private async createPeerConnection(sessionId: string, callType: CallType, isCaller: boolean): Promise<void> {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.rtcPeer = new RTCPeerConnection(config);

    // ICE candidate 事件
    this.rtcPeer.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        wsService.send('call_ice_candidate', {
          sessionId,
          candidate: event.candidate,
        });
      }
    });

    // 连接状态变化
    this.rtcPeer.addEventListener('connectionstatechange', () => {
      if (this.rtcPeer?.connectionState === 'failed' ||
          this.rtcPeer?.connectionState === 'disconnected') {
        console.warn('[Call] Connection state:', this.rtcPeer?.connectionState);
      }
    });

    // 远程媒体流
    this.rtcPeer.addEventListener('track', (event: any) => {
      console.log('[Call] Remote track received');
      this.remoteStream = event.streams[0];
      this.onStreamChange?.();
    });

    // 获取本地媒体（使用 react-native-webrtc 的 mediaDevices）
    const constraints: any = {
      audio: true,
      video: callType === 'video',
    };
    this.localStream = (await mediaDevices.getUserMedia(constraints)) as MediaStream;
    this.onStreamChange?.();

    this.localStream.getTracks().forEach((track: any) => {
      this.rtcPeer!.addTrack(track, this.localStream!);
    });

    // 如果是被叫方且有待处理的 offer，设置远程 SDP
    if (!isCaller && this.pendingOffer) {
      await this.rtcPeer.setRemoteDescription(
        new RTCSessionDescription(this.pendingOffer)
      );
      this.pendingOffer = null;
    }
  }

  private generateSessionId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleCallTimeout() {
    const store = useCallStore.getState();
    if (store.status === 'ringing') {
      this.cleanup();
      store.endCall();
      setTimeout(() => store.reset(), 500);
      Alert.alert('提示', '对方无应答');
    }
  }

  private startDurationTimer() {
    this.durationTimer = setInterval(() => {
      useCallStore.getState().tickDuration();
    }, 1000);
  }

  private clearCallTimeout() {
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
  }

  private cleanup() {
    this.clearCallTimeout();
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t: any) => t.stop());
      this.localStream = null;
    }
    if (this.rtcPeer) {
      this.rtcPeer.close();
      this.rtcPeer = null;
    }
    this.pendingOffer = null;
    this.remoteStream = null;
  }

  // ============================================================
  // 权限检查
  // ============================================================

  private async checkPermissions(callType: CallType): Promise<boolean> {
    if (Platform.OS === 'android') {
      const permissions: Array<typeof PermissionsAndroid.PERMISSIONS[keyof typeof PermissionsAndroid.PERMISSIONS]> = [];
      permissions.push(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (callType === 'video') {
        permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      try {
        const grants = await PermissionsAndroid.requestMultiple(
          permissions as any
        );
        const allGranted = permissions.every(
          (p) => grants[p as keyof typeof grants] === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!allGranted) {
          Alert.alert('权限不足', '请授予麦克风和摄像头权限以使用通话功能');
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }
    // iOS permissions handled by Info.plist
    return true;
  }
}

// 单例
export const callManager = new CallManager();
export default callManager;
