// 通话状态管理 (Zustand)
// v4.1: 桌面端音视频通话状态

import { create } from 'zustand';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
export type CallDirection = 'outgoing' | 'incoming';

interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
  callType: CallType;
  offer?: { sdp: string; type: string };
}

interface CallStore {
  // 当前通话状态
  status: CallStatus;
  sessionId: string | null;
  callType: CallType;
  direction: CallDirection;
  remoteUserId: string | null;
  remoteUserName: string | null;
  callStartTime: number | null;
  durationSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;

  // 来电
  incomingCall: IncomingCall | null;

  // 动作
  setIncomingCall: (data: IncomingCall | null) => void;
  startOutgoingCall: (data: {
    sessionId: string;
    remoteUserId: string;
    remoteUserName: string;
    callType: CallType;
  }) => void;
  callConnected: (sessionId: string, startTime?: number) => void;
  endCall: () => void;
  setMuted: (muted: boolean) => void;
  setCameraOff: (off: boolean) => void;
  setSpeakerOn: (on: boolean) => void;
  tickDuration: () => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as CallStatus,
  sessionId: null as string | null,
  callType: 'audio' as CallType,
  direction: 'incoming' as CallDirection,
  remoteUserId: null as string | null,
  remoteUserName: null as string | null,
  callStartTime: null as number | null,
  durationSeconds: 0,
  isMuted: false,
  isCameraOff: false,
  isSpeakerOn: true,
  incomingCall: null as IncomingCall | null,
};

export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  setIncomingCall: (data) => {
    if (data) {
      set({
        incomingCall: data,
        status: 'ringing',
        sessionId: data.sessionId,
        callType: data.callType,
        direction: 'incoming',
        remoteUserId: data.callerId,
        remoteUserName: data.callerName,
      });
    } else {
      set({ incomingCall: null });
    }
  },

  startOutgoingCall: (data) => {
    set({
      sessionId: data.sessionId,
      callType: data.callType,
      direction: 'outgoing',
      remoteUserId: data.remoteUserId,
      remoteUserName: data.remoteUserName,
      status: 'ringing',
      callStartTime: Date.now(),
    });
  },

  callConnected: (sessionId, startTime) => {
    set({
      status: 'connected',
      sessionId,
      callStartTime: startTime || Date.now(),
      durationSeconds: 0,
    });
  },

  endCall: () => {
    set({
      status: 'ended',
      incomingCall: null,
    });
  },

  setMuted: (muted) => set({ isMuted: muted }),
  setCameraOff: (off) => set({ isCameraOff: off }),
  setSpeakerOn: (on) => set({ isSpeakerOn: on }),

  tickDuration: () => {
    const { status, callStartTime } = get();
    if (status === 'connected' && callStartTime) {
      set({ durationSeconds: Math.floor((Date.now() - callStartTime) / 1000) });
    }
  },

  reset: () => set(initialState),
}));
