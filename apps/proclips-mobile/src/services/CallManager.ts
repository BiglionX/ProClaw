// Call manager - signaling + media (LiveKit on native, WebRTC on web)
// v4.1 PRD Phase 1: LiveKit SFU replaces P2P WebRTC on iOS/Android

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
  isWebRTCNativeAvailable,
} from './WebRTC';
import wsService from './WebSocketService';
import { useCallStore, CallType } from '../stores/CallStore';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';
import { ConnectionState } from 'livekit-client';
import {
  buildRoomName,
  isLiveKitNativeAvailable,
  liveKitService,
} from './LiveKitService';

type OfferPayload = RTCSessionDescriptionInit;

const useLiveKitMedia = (): boolean => isLiveKitNativeAvailable();

const isCallMediaAvailable = (): boolean => {
  if (useLiveKitMedia()) return true;
  if (Platform.OS === 'web') return typeof RTCPeerConnection === 'function';
  return isWebRTCNativeAvailable() && typeof RTCPeerConnection === 'function';
};

class CallManager {
  private callTimeout: ReturnType<typeof setTimeout> | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];
  private rtcPeer: RTCPeerConnection | null = null;
  private pendingOffer: OfferPayload | null = null;
  private activeRoomName: string | null = null;

  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  onStreamChange: (() => void) | null = null;

  init() {
    liveKitService.setStreamCallbacks({
      onLocalStream: (stream) => {
        this.localStream = stream;
        this.onStreamChange?.();
      },
      onRemoteStream: (stream) => {
        this.remoteStream = stream;
        this.onStreamChange?.();
      },
    });

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

  destroy() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    this.cleanup();
  }

  async startCall(targetUserId: string, targetUserName: string, callType: CallType): Promise<boolean> {
    if (!isCallMediaAvailable()) {
      Alert.alert('提示', '当前平台不支持音视频通话，请使用 Expo Dev Client 构建');
      return false;
    }

    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      Alert.alert('提示', '当前已在通话中，请先结束当前通话');
      return false;
    }

    if (!(await this.checkPermissions(callType))) {
      return false;
    }

    const sessionId = this.generateSessionId();
    const userId = wsService.currentUserId;
    const roomName = buildRoomName(sessionId);
    this.activeRoomName = roomName;

    store.startOutgoingCall({
      sessionId,
      remoteUserId: targetUserId,
      remoteUserName: targetUserName,
      callType,
    });

    if (useLiveKitMedia()) {
      wsService.send('call_offer', {
        sessionId,
        callType,
        callerId: userId,
        calleeId: targetUserId,
        roomName,
      }, targetUserId);

      this.callTimeout = setTimeout(() => this.handleCallTimeout(), 30000);
      return true;
    }

    try {
      await this.createPeerConnection(sessionId, callType, true);
    } catch (e) {
      logger.error('[Call] Failed to create peer connection:', e);
      Alert.alert('错误', '无法初始化通话，请检查设备权限');
      return false;
    }

    if (!this.rtcPeer) {
      this.failOutgoingCall('无法创建通话连接');
      return false;
    }

    try {
      const offer = await this.rtcPeer.createOffer({});
      await this.rtcPeer.setLocalDescription(offer);
      wsService.send('call_offer', {
        sessionId,
        callType,
        callerId: userId,
        calleeId: targetUserId,
        offer: { sdp: offer.sdp, type: offer.type },
      }, targetUserId);
      this.callTimeout = setTimeout(() => this.handleCallTimeout(), 30000);
      return true;
    } catch (offerError) {
      logger.error('[Call] Failed to create SDP offer:', offerError);
      this.failOutgoingCall('无法创建通话邀请');
      return false;
    }
  }

  async acceptIncoming(): Promise<void> {
    const store = useCallStore.getState();
    const call = store.incomingCall;
    if (!call) return;

    if (!(await this.checkPermissions(call.callType))) {
      return;
    }

    if (useLiveKitMedia()) {
      const roomName = call.roomName ?? buildRoomName(call.sessionId);
      this.activeRoomName = roomName;
      const identity = wsService.currentUserId;
      if (!identity) {
        this.rejectIncoming();
        return;
      }

      const joined = await liveKitService.joinCallRoom({
        roomName,
        participantIdentity: identity,
        callType: call.callType,
      });

      if (!joined) {
        Alert.alert('错误', '无法加入通话房间');
        wsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
        store.setIncomingCall(null);
        return;
      }

      wsService.send('call_answer', { sessionId: call.sessionId, joined: true }, call.callerId);
      store.callConnected(call.sessionId);
      store.setIncomingCall(null);
      this.clearCallTimeout();
      this.startDurationTimer();
      return;
    }

    try {
      await this.createPeerConnection(call.sessionId, call.callType, false);
    } catch (e) {
      logger.error('[Call] Failed to create peer connection for answer:', e);
      wsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
      store.setIncomingCall(null);
      return;
    }

    if (!this.rtcPeer) {
      wsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
      store.setIncomingCall(null);
      this.cleanup();
      return;
    }

    try {
      const answer = await this.rtcPeer.createAnswer();
      await this.rtcPeer.setLocalDescription(answer);
      wsService.send('call_answer', {
        sessionId: call.sessionId,
        answer: { sdp: answer.sdp, type: answer.type },
      }, call.callerId);
      store.callConnected(call.sessionId);
      store.setIncomingCall(null);
      this.startDurationTimer();
    } catch (answerError) {
      logger.error('[Call] Failed to create SDP answer:', answerError);
      wsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
      store.setIncomingCall(null);
      this.cleanup();
    }
  }

  rejectIncoming(reason?: string) {
    const store = useCallStore.getState();
    const call = store.incomingCall;
    if (!call) return;

    const msgType = reason === 'busy' ? 'call_busy' : 'call_reject';
    wsService.send(msgType, { sessionId: call.sessionId }, call.callerId);
    store.setIncomingCall(null);
    store.reset();
  }

  hangup() {
    const store = useCallStore.getState();
    if (!store.sessionId) return;

    const remoteUserId = store.remoteUserId;
    wsService.send('call_hangup', { sessionId: store.sessionId }, remoteUserId || undefined);

    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
  }

  toggleMute() {
    const store = useCallStore.getState();
    const willBeMuted = !store.isMuted;

    if (useLiveKitMedia()) {
      liveKitService.setMicrophoneEnabled(!willBeMuted).catch((e) => {
        logger.warn('[Call] LiveKit mute toggle failed:', getErrorMessage(e));
      });
    } else if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !willBeMuted;
    }
    store.setMuted(willBeMuted);
  }

  toggleCamera() {
    const store = useCallStore.getState();
    const willBeCameraOff = !store.isCameraOff;

    if (useLiveKitMedia()) {
      liveKitService.setCameraEnabled(!willBeCameraOff).catch((e) => {
        logger.warn('[Call] LiveKit camera toggle failed:', getErrorMessage(e));
      });
    } else if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !willBeCameraOff;
    }
    store.setCameraOff(willBeCameraOff);
  }

  toggleSpeaker() {
    const store = useCallStore.getState();
    store.setSpeakerOn(!store.isSpeakerOn);
  }

  private async handleIncomingOffer(_type: string, data: any) {
    const payload = data.payload || {};
    const { sessionId, callerId, callType, roomName, livekitUrl } = payload;
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
      roomName: roomName || buildRoomName(sessionId),
      livekitUrl,
    });

    if (!useLiveKitMedia() && payload.offer) {
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
    logger.log('[Call] Offer sent successfully');
  }

  private async handleAnswer(_type: string, data: any) {
    const payload = data.payload || {};
    const { sessionId, answer } = payload;
    if (!sessionId) return;

    if (useLiveKitMedia()) {
      const store = useCallStore.getState();
      if (store.sessionId !== sessionId) return;

      const identity = wsService.currentUserId;
      const roomName = this.activeRoomName ?? buildRoomName(sessionId);
      if (!identity) return;

      if (liveKitService.connectionState !== ConnectionState.Connected) {
        const joined = await liveKitService.joinCallRoom({
          roomName,
          participantIdentity: identity,
          callType: store.callType,
        });
        if (!joined) {
          Alert.alert('错误', '无法加入通话房间');
          this.cleanup();
          store.endCall();
          setTimeout(() => store.reset(), 500);
          return;
        }
      }

      store.callConnected(sessionId);
      this.clearCallTimeout();
      this.startDurationTimer();
      return;
    }

    if (!answer || !this.rtcPeer) return;

    try {
      await this.rtcPeer.setRemoteDescription(new RTCSessionDescription(answer));
      useCallStore.getState().callConnected(sessionId);
      this.clearCallTimeout();
      this.startDurationTimer();
    } catch (e) {
      logger.error('[Call] Failed to set remote SDP:', e);
    }
  }

  private async handleIceCandidate(_type: string, data: any) {
    if (useLiveKitMedia()) return;

    const payload = data.payload || {};
    const { sessionId, candidate } = payload;
    if (!sessionId || !candidate || !this.rtcPeer) return;

    try {
      await this.rtcPeer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      logger.error('[Call] Failed to add ICE candidate:', e);
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

  private failOutgoingCall(message: string) {
    const store = useCallStore.getState();
    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
    Alert.alert('错误', message);
  }

  private async createPeerConnection(sessionId: string, callType: CallType, isCaller: boolean): Promise<void> {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.rtcPeer = new RTCPeerConnection(config);

    this.rtcPeer.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        wsService.send('call_ice_candidate', { sessionId, candidate: event.candidate });
      }
    });

    this.rtcPeer.addEventListener('track', (event: any) => {
      this.remoteStream = event.streams[0];
      this.onStreamChange?.();
    });

    const constraints: any = { audio: true, video: callType === 'video' };
    try {
      this.localStream = (await mediaDevices.getUserMedia(constraints)) as MediaStream;
    } catch (mediaError) {
      this.rtcPeer.close();
      this.rtcPeer = null;
      throw mediaError;
    }
    this.onStreamChange?.();

    this.localStream.getTracks().forEach((track: any) => {
      this.rtcPeer!.addTrack(track, this.localStream!);
    });

    if (!isCaller && this.pendingOffer) {
      await this.rtcPeer.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
      this.pendingOffer = null;
    }
  }

  private generateSessionId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

    if (useLiveKitMedia()) {
      liveKitService.disconnect().catch((e) => {
        logger.warn('[Call] LiveKit disconnect failed:', getErrorMessage(e));
      });
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
    this.activeRoomName = null;
  }

  private async checkPermissions(callType: CallType): Promise<boolean> {
    if (Platform.OS === 'android') {
      const permissions: Array<typeof PermissionsAndroid.PERMISSIONS[keyof typeof PermissionsAndroid.PERMISSIONS]> = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];
      if (callType === 'video') {
        permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      try {
        const grants = await PermissionsAndroid.requestMultiple(permissions as any);
        const allGranted = permissions.every(
          (p) => grants[p as keyof typeof grants] === PermissionsAndroid.RESULTS.GRANTED,
        );
        if (!allGranted) {
          Alert.alert('权限不足', '请授予麦克风和摄像头权限以使用通话功能');
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    if (Platform.OS === 'ios' && !useLiveKitMedia()) {
      try {
        const testStream = await mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        testStream.getTracks().forEach((t: any) => t.stop());
        return true;
      } catch (e) {
        Alert.alert('权限不足', '请在系统设置中允许 ProClaw 访问麦克风' + (callType === 'video' ? '和摄像头' : ''));
        return false;
      }
    }

    return true;
  }
}

export const callManager = new CallManager();
export default callManager;