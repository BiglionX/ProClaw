/// <reference types="jest" />

/**
 * CallManager 单元测试
 * 测试媒体控制、状态管理
 */

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
}));

// Mock CallStore
interface MockCallStoreType {
  status: string;
  sessionId: string | null;
  incomingCall: any;
  remoteUserId: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  startOutgoingCall: jest.Mock;
  callConnected: jest.Mock;
  setIncomingCall: jest.Mock;
  endCall: jest.Mock;
  reset: jest.Mock;
  setMuted: jest.Mock;
  setCameraOff: jest.Mock;
  setSpeakerOn: jest.Mock;
  tickDuration: jest.Mock;
  getState: jest.Mock;
}

const mockCallStore: MockCallStoreType = {
  status: 'idle',
  sessionId: null,
  incomingCall: null,
  remoteUserId: null,
  isMuted: false,
  isCameraOff: false,
  isSpeakerOn: false,
  startOutgoingCall: jest.fn(),
  callConnected: jest.fn(),
  setIncomingCall: jest.fn(),
  endCall: jest.fn(),
  reset: jest.fn(),
  setMuted: jest.fn(),
  setCameraOff: jest.fn(),
  setSpeakerOn: jest.fn(),
  tickDuration: jest.fn(),
  getState: jest.fn(),
};

jest.mock('../../stores/CallStore', () => ({
  useCallStore: mockCallStore,
  CallType: { audio: 'audio', video: 'video' },
}));

jest.mock('../LiveKitService', () => ({
  buildRoomName: (id: string) => `proclaw-call-${id}`,
  isLiveKitNativeAvailable: () => false,
  liveKitService: {
    setStreamCallbacks: jest.fn(),
    setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
    setCameraEnabled: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    joinCallRoom: jest.fn().mockResolvedValue(false),
    connectionState: 'disconnected',
    activeRoom: null,
  },
}));

jest.mock('../WebSocketService', () => ({
  __esModule: true,
  default: {
    on: jest.fn(() => () => {}),
    send: jest.fn(),
    currentUserId: 'test-user',
  },
}));

// 直接导入 CallManager 并测试其方法
import { callManager } from '../CallManager';

describe('CallManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置 CallStore 状态
    mockCallStore.status = 'idle';
    mockCallStore.sessionId = null;
    mockCallStore.incomingCall = null;
    mockCallStore.isMuted = false;
    mockCallStore.isCameraOff = false;
    mockCallStore.isSpeakerOn = false;
    mockCallStore.getState.mockReturnValue(mockCallStore);
  });

  // ============================================================
  // 媒体控制（不依赖 WebRTC）
  // ============================================================

  describe('媒体控制', () => {
    it('toggleMute 应切换静音状态（false -> true）', () => {
      mockCallStore.isMuted = false;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.toggleMute();

      expect(mockCallStore.setMuted).toHaveBeenCalledWith(true);
    });

    it('toggleMute 应切换静音状态（true -> false）', () => {
      mockCallStore.isMuted = true;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.toggleMute();

      expect(mockCallStore.setMuted).toHaveBeenCalledWith(false);
    });

    it('toggleCamera 应切换摄像头状态（false -> true）', () => {
      mockCallStore.isCameraOff = false;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.toggleCamera();

      expect(mockCallStore.setCameraOff).toHaveBeenCalledWith(true);
    });

    it('toggleCamera 应切换摄像头状态（true -> false）', () => {
      mockCallStore.isCameraOff = true;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.toggleCamera();

      expect(mockCallStore.setCameraOff).toHaveBeenCalledWith(false);
    });

    it('toggleSpeaker 应切换扬声器状态（false -> true）', () => {
      mockCallStore.isSpeakerOn = false;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.toggleSpeaker();

      expect(mockCallStore.setSpeakerOn).toHaveBeenCalledWith(true);
    });

    it('toggleSpeaker 应切换扬声器状态（true -> false）', () => {
      mockCallStore.isSpeakerOn = true;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.toggleSpeaker();

      expect(mockCallStore.setSpeakerOn).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================
  // 挂断
  // ============================================================

  describe('挂断', () => {
    it('无 sessionId 时挂断不应发送消息', () => {
      mockCallStore.sessionId = null;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.hangup();

      expect(mockCallStore.endCall).not.toHaveBeenCalled();
    });

    it('挂断后应调用 endCall', () => {
      mockCallStore.sessionId = 'session_123';
      mockCallStore.remoteUserId = 'user456';
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.hangup();

      expect(mockCallStore.endCall).toHaveBeenCalled();
    });
  });

  // ============================================================
  // rejectIncoming
  // ============================================================

  describe('rejectIncoming', () => {
    it('无来电时 rejectIncoming 应直接返回', () => {
      mockCallStore.incomingCall = null;
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.rejectIncoming();

      expect(mockCallStore.reset).not.toHaveBeenCalled();
    });

    it('有来电时应发送 call_reject 并清除来电', () => {
      mockCallStore.incomingCall = {
        sessionId: 'session_123',
        callerId: 'user456',
        callerName: '测试用户',
        callType: 'audio' as any,
      };
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.rejectIncoming();

      expect(mockCallStore.setIncomingCall).toHaveBeenCalledWith(null);
      expect(mockCallStore.reset).toHaveBeenCalled();
    });

    it('busy 原因时应发送 call_busy', () => {
      mockCallStore.incomingCall = {
        sessionId: 'session_123',
        callerId: 'user456',
        callerName: '测试用户',
        callType: 'audio' as any,
      };
      mockCallStore.getState.mockReturnValue(mockCallStore);

      callManager.rejectIncoming('busy');

      expect(mockCallStore.setIncomingCall).toHaveBeenCalledWith(null);
      expect(mockCallStore.reset).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 通话生命周期
  // ============================================================

  describe('通话生命周期', () => {
    it('init 应注册事件监听器', () => {
      const wsService = require('../WebSocketService').default;

      callManager.init();

      expect(wsService.on).toHaveBeenCalledWith('call_offer', expect.any(Function));
      expect(wsService.on).toHaveBeenCalledWith('call_answer', expect.any(Function));
      expect(wsService.on).toHaveBeenCalledWith('call_hangup', expect.any(Function));
      expect(wsService.on).toHaveBeenCalledWith('call_reject', expect.any(Function));
      expect(wsService.on).toHaveBeenCalledWith('call_busy', expect.any(Function));
    });

    it('destroy 应清理资源', () => {
      callManager.init();
      callManager.destroy();

      expect(callManager.localStream).toBeNull();
      expect(callManager.remoteStream).toBeNull();
    });

    it('startCall 应生成唯一 sessionId', () => {
      const sessionId1 = (callManager as any).generateSessionId();
      const sessionId2 = (callManager as any).generateSessionId();

      expect(sessionId1).toMatch(/call_\d+_.+/);
      expect(sessionId2).toMatch(/call_\d+_.+/);
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('已有通话时 startCall 应返回 false', async () => {
      mockCallStore.status = 'connected';
      mockCallStore.getState.mockReturnValue(mockCallStore);

      const result = await callManager.startCall('user456', '测试用户', 'audio');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // 来电处理
  // ============================================================

  describe('来电处理', () => {
    it('handleIncomingOffer 应设置来电状态', () => {
      callManager.init();
      mockCallStore.status = 'idle';
      mockCallStore.getState.mockReturnValue(mockCallStore);

      const wsService = require('../WebSocketService').default;
      const handleOffer = wsService.on.mock.calls.find((call: any) => call[0] === 'call_offer')[1];

      handleOffer('call_offer', {
        payload: {
          sessionId: 'session_123',
          callerId: 'user456',
          callerName: '测试用户',
          callType: 'audio',
        },
      });

      expect(mockCallStore.setIncomingCall).toHaveBeenCalled();
      callManager.destroy();
    });

    it('通话中收到来电应发送 call_busy', () => {
      callManager.init();
      mockCallStore.status = 'connected';
      mockCallStore.getState.mockReturnValue(mockCallStore);

      const wsService = require('../WebSocketService').default;
      const handleOffer = wsService.on.mock.calls.find((call: any) => call[0] === 'call_offer')[1];

      handleOffer('call_offer', {
        payload: {
          sessionId: 'session_123',
          callerId: 'user456',
        },
      });

      expect(wsService.send).toHaveBeenCalledWith('call_busy', expect.any(Object), 'user456');
      callManager.destroy();
    });
  });
});