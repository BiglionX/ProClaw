// 桌面端通话管理器
// v4.1: 音视频通话管理器（WebRTC + WebSocket 信令）

import { useCallStore, CallType } from '../lib/callStore';
import desktopWsService from './WebSocketService';

class DesktopCallManager {
  private rtcPeer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callTimeout: ReturnType<typeof setTimeout> | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];
  private pendingOffer: any = null;

  remoteStream: MediaStream | null = null;

  init(): void {
    this.unsubscribers.push(
      desktopWsService.on('call_offer', this.handleIncomingOffer.bind(this)),
      desktopWsService.on('call_offer_sent', this.handleOfferSent.bind(this)),
      desktopWsService.on('call_answer', this.handleAnswer.bind(this)),
      desktopWsService.on('call_ice_candidate', this.handleIceCandidate.bind(this)),
      desktopWsService.on('call_hangup', this.handleRemoteHangup.bind(this)),
      desktopWsService.on('call_reject', this.handleReject.bind(this)),
      desktopWsService.on('call_busy', this.handleBusy.bind(this)),
      desktopWsService.on('call_offline', this.handleOffline.bind(this)),
    );
  }

  destroy(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    this.cleanup();
  }

  // ============================================================
  // 发起通话
  // ============================================================

  async startCall(targetUserId: string, targetUserName: string, callType: CallType): Promise<boolean> {
    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      alert('当前已在通话中，请先结束当前通话');
      return false;
    }

    const sessionId = this.generateSessionId();
    const userId = desktopWsService.currentUserId;

    try {
      await this.createPeerConnection(sessionId, callType, true);
    } catch (e) {
      console.error('[Call] Failed to create peer:', e);
      alert('无法初始化通话设备');
      return false;
    }

    store.startOutgoingCall({ sessionId, remoteUserId: targetUserId, remoteUserName: targetUserName, callType });

    const offer = await this.rtcPeer!.createOffer();
    await this.rtcPeer!.setLocalDescription(offer);

    desktopWsService.send('call_offer', {
      sessionId, callType,
      callerId: userId,
      calleeId: targetUserId,
      offer: { sdp: offer.sdp, type: offer.type },
    }, targetUserId);

    this.callTimeout = setTimeout(() => this.handleCallTimeout(), 30000);
    return true;
  }

  // ============================================================
  // 接听/拒绝
  // ============================================================

  async acceptIncoming(): Promise<void> {
    const store = useCallStore.getState();
    const call = store.incomingCall;
    if (!call) return;

    try {
      await this.createPeerConnection(call.sessionId, call.callType, false);
    } catch (e) {
      desktopWsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
      useCallStore.getState().setIncomingCall(null);
      return;
    }

    const answer = await this.rtcPeer!.createAnswer();
    await this.rtcPeer!.setLocalDescription(answer);

    desktopWsService.send('call_answer', {
      sessionId: call.sessionId,
      answer: { sdp: answer.sdp, type: answer.type },
    }, call.callerId);

    store.callConnected(call.sessionId);
    store.setIncomingCall(null);
    this.startDurationTimer();
  }

  rejectIncoming(reason?: string): void {
    const call = useCallStore.getState().incomingCall;
    if (!call) return;

    const msgType = reason === 'busy' ? 'call_busy' : 'call_reject';
    desktopWsService.send(msgType, { sessionId: call.sessionId }, call.callerId);
    useCallStore.getState().setIncomingCall(null);
    useCallStore.getState().reset();
  }

  hangup(): void {
    const { sessionId, remoteUserId } = useCallStore.getState();
    if (!sessionId) return;
    desktopWsService.send('call_hangup', { sessionId }, remoteUserId!);
    this.cleanup();
    useCallStore.getState().endCall();
    setTimeout(() => useCallStore.getState().reset(), 500);
  }

  // ============================================================
  // 媒体控制
  // ============================================================

  toggleMute(): void {
    const store = useCallStore.getState();
    if (this.localStream) {
      const track = this.localStream.getAudioTracks()[0];
      if (track) track.enabled = store.isMuted;
    }
    store.setMuted(!store.isMuted);
  }

  toggleCamera(): void {
    const store = useCallStore.getState();
    if (this.localStream) {
      const track = this.localStream.getVideoTracks()[0];
      if (track) track.enabled = store.isCameraOff;
    }
    store.setCameraOff(!store.isCameraOff);
  }

  toggleSpeaker(): void {
    useCallStore.getState().setSpeakerOn(!useCallStore.getState().isSpeakerOn);
  }

  // ============================================================
  // 信令处理
  // ============================================================

  private async handleIncomingOffer(_type: string, data: any): Promise<void> {
    const payload = data.payload || {};
    const { sessionId, callerId, callType, callerName } = payload;
    if (!sessionId) return;

    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      desktopWsService.send('call_busy', { sessionId }, callerId);
      return;
    }

    store.setIncomingCall({
      sessionId,
      callerId: callerId || '',
      callerName: callerName || callerId || '未知用户',
      callType: callType || 'audio',
      offer: payload.offer,
    });

    this.pendingOffer = payload.offer || null;

    this.callTimeout = setTimeout(() => {
      if (useCallStore.getState().status === 'ringing') this.rejectIncoming();
    }, 30000);
  }

  private handleOfferSent(): void {
    console.log('[Call] Offer sent');
  }

  private async handleAnswer(_type: string, data: any): Promise<void> {
    const { sessionId, answer } = data.payload || {};
    if (!sessionId || !answer || !this.rtcPeer) return;
    try {
      await this.rtcPeer.setRemoteDescription(new RTCSessionDescription(answer));
      useCallStore.getState().callConnected(sessionId);
      this.clearTimeout();
      this.startDurationTimer();
    } catch (e) {
      console.error('[Call] setRemoteDescription failed:', e);
    }
  }

  private async handleIceCandidate(_type: string, data: any): Promise<void> {
    const { sessionId, candidate } = data.payload || {};
    if (!sessionId || !candidate || !this.rtcPeer) return;
    try {
      await this.rtcPeer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[Call] addIceCandidate failed:', e);
    }
  }

  private handleRemoteHangup(_type: string, data: any): void {
    const payload = data.payload || {};
    const store = useCallStore.getState();
    if (store.sessionId !== payload.sessionId) return;

    if (payload.reason === 'answered_elsewhere') {
      store.setIncomingCall(null);
      store.reset();
      return;
    }

    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
  }

  private handleReject(_type: string, data: any): void {
    const store = useCallStore.getState();
    if (store.sessionId !== (data.payload?.sessionId)) return;
    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
  }

  private handleBusy(_type: string, data: any): void {
    const store = useCallStore.getState();
    if (store.sessionId !== (data.payload?.sessionId)) return;
    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
  }

  private handleOffline(_type: string, data: any): void {
    const store = useCallStore.getState();
    if (store.sessionId !== (data.payload?.sessionId)) return;
    this.cleanup();
    store.endCall();
    setTimeout(() => store.reset(), 500);
  }

  // ============================================================
  // WebRTC
  // ============================================================

  private async createPeerConnection(sessionId: string, callType: CallType, isCaller: boolean): Promise<void> {
    this.rtcPeer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.rtcPeer.onicecandidate = (event) => {
      if (event.candidate) {
        desktopWsService.send('call_ice_candidate', { sessionId, candidate: event.candidate });
      }
    };

    this.rtcPeer.ontrack = (event) => {
      this.remoteStream = event.streams[0];
    };

    // 获取本地媒体
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });

    this.localStream.getTracks().forEach((track) => {
      this.rtcPeer!.addTrack(track, this.localStream!);
    });

    if (!isCaller && this.pendingOffer) {
      await this.rtcPeer.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
      this.pendingOffer = null;
    }
  }

  private generateSessionId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleCallTimeout(): void {
    const store = useCallStore.getState();
    if (store.status === 'ringing') {
      this.cleanup();
      store.endCall();
      setTimeout(() => store.reset(), 500);
    }
  }

  private startDurationTimer(): void {
    this.durationTimer = setInterval(() => useCallStore.getState().tickDuration(), 1000);
  }

  private clearTimeout(): void {
    if (this.callTimeout) { clearTimeout(this.callTimeout); this.callTimeout = null; }
  }

  private cleanup(): void {
    this.clearTimeout();
    if (this.durationTimer) { clearInterval(this.durationTimer); this.durationTimer = null; }
    if (this.localStream) { this.localStream.getTracks().forEach((t) => t.stop()); this.localStream = null; }
    if (this.rtcPeer) { this.rtcPeer.close(); this.rtcPeer = null; }
    this.remoteStream = null;
    this.pendingOffer = null;
  }
}

export const desktopCallManager = new DesktopCallManager();
export default desktopCallManager;
