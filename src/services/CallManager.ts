// Desktop call manager — LiveKit SFU + WebSocket signaling (PRD v4.1 Phase 4)

import { ConnectionState } from 'livekit-client';
import { useCallStore, CallType } from '../lib/callStore';
import desktopWsService from './WebSocketService';
import {
  buildRoomName,
  isLiveKitAvailable,
  liveKitService,
} from './LiveKitService';

class DesktopCallManager {
  private callTimeout: ReturnType<typeof setTimeout> | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];
  private activeRoomName: string | null = null;

  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  onStreamChange: (() => void) | null = null;

  init(): void {
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
      desktopWsService.on('call_offer', this.handleIncomingOffer.bind(this)),
      desktopWsService.on('call_offer_sent', this.handleOfferSent.bind(this)),
      desktopWsService.on('call_answer', this.handleAnswer.bind(this)),
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

  async startCall(targetUserId: string, targetUserName: string, callType: CallType): Promise<boolean> {
    if (!isLiveKitAvailable()) {
      alert('当前环境不支持音视频通话');
      return false;
    }

    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      alert('当前已在通话中，请先结束当前通话');
      return false;
    }

    const sessionId = this.generateSessionId();
    const userId = desktopWsService.currentUserId;
    if (!userId) {
      alert('未连接到通话服务，请重新登录');
      return false;
    }

    const roomName = buildRoomName(sessionId);
    this.activeRoomName = roomName;

    store.startOutgoingCall({
      sessionId,
      remoteUserId: targetUserId,
      remoteUserName: targetUserName,
      callType,
    });

    desktopWsService.send('call_offer', {
      sessionId,
      callType,
      callerId: userId,
      calleeId: targetUserId,
      roomName,
    }, targetUserId);

    this.callTimeout = setTimeout(() => this.handleCallTimeout(), 30000);
    return true;
  }

  async acceptIncoming(): Promise<void> {
    const store = useCallStore.getState();
    const call = store.incomingCall;
    if (!call) return;

    const roomName = call.roomName ?? buildRoomName(call.sessionId);
    this.activeRoomName = roomName;
    const identity = desktopWsService.currentUserId;
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
      alert('无法加入通话房间');
      desktopWsService.send('call_reject', { sessionId: call.sessionId }, call.callerId);
      store.setIncomingCall(null);
      return;
    }

    desktopWsService.send('call_answer', { sessionId: call.sessionId, joined: true }, call.callerId);
    store.callConnected(call.sessionId);
    store.setIncomingCall(null);
    this.clearCallTimeout();
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

  toggleMute(): void {
    const store = useCallStore.getState();
    const willBeMuted = !store.isMuted;
    liveKitService.setMicrophoneEnabled(!willBeMuted).catch(() => {});
    store.setMuted(willBeMuted);
  }

  toggleCamera(): void {
    const store = useCallStore.getState();
    const willBeCameraOff = !store.isCameraOff;
    liveKitService.setCameraEnabled(!willBeCameraOff).catch(() => {});
    store.setCameraOff(willBeCameraOff);
  }

  toggleSpeaker(): void {
    useCallStore.getState().setSpeakerOn(!useCallStore.getState().isSpeakerOn);
  }

  private async handleIncomingOffer(_type: string, data: any): Promise<void> {
    const payload = data.payload || {};
    const { sessionId, callerId, callType, roomName, livekitUrl } = payload;
    if (!sessionId) return;

    const callerName = payload.callerName || callerId || '未知用户';
    const store = useCallStore.getState();

    if (store.status !== 'idle') {
      desktopWsService.send('call_busy', { sessionId }, callerId);
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

    this.callTimeout = setTimeout(() => {
      const s = useCallStore.getState();
      if (s.status === 'ringing' && s.incomingCall) {
        this.rejectIncoming();
      }
    }, 30000);
  }

  private handleOfferSent(): void {
    console.log('[Call] Offer sent');
  }

  private async handleAnswer(_type: string, data: any): Promise<void> {
    const payload = data.payload || {};
    const { sessionId } = payload;
    if (!sessionId) return;

    const store = useCallStore.getState();
    if (store.sessionId !== sessionId) return;

    const identity = desktopWsService.currentUserId;
    const roomName = this.activeRoomName ?? buildRoomName(sessionId);
    if (!identity) return;

    if (liveKitService.connectionState !== ConnectionState.Connected) {
      const joined = await liveKitService.joinCallRoom({
        roomName,
        participantIdentity: identity,
        callType: store.callType,
      });
      if (!joined) {
        alert('无法加入通话房间');
        this.cleanup();
        store.endCall();
        setTimeout(() => store.reset(), 500);
        return;
      }
    }

    store.callConnected(sessionId);
    this.clearCallTimeout();
    this.startDurationTimer();
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

  private generateSessionId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

  private clearCallTimeout(): void {
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
  }

  private cleanup(): void {
    this.clearCallTimeout();
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    liveKitService.disconnect().catch(() => {});
    this.localStream = null;
    this.remoteStream = null;
    this.activeRoomName = null;
  }
}

export const desktopCallManager = new DesktopCallManager();
export default desktopCallManager;
