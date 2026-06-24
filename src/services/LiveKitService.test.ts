import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionState } from 'livekit-client';

const mockPost = vi.fn();
vi.mock('../lib/apiClient', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSetMicrophoneEnabled = vi.fn();
const mockSetCameraEnabled = vi.fn();

vi.mock('livekit-client', async () => {
  const actual = await vi.importActual<typeof import('livekit-client')>('livekit-client');
  class MockRoom {
    state = ConnectionState.Disconnected;
    localParticipant = {
      trackPublications: new Map(),
      setMicrophoneEnabled: mockSetMicrophoneEnabled,
      setCameraEnabled: mockSetCameraEnabled,
    };
    remoteParticipants = new Map();
    on = vi.fn();
    connect = mockConnect;
    disconnect = mockDisconnect;
  }
  return {
    ...actual,
    Room: MockRoom,
  };
});

import {
  buildRoomName,
  fetchLiveKitToken,
  isLiveKitAvailable,
  liveKitService,
} from './LiveKitService';

describe('LiveKitService (desktop)', () => {
  beforeEach(() => {
    vi.stubGlobal('RTCPeerConnection', class {} as typeof RTCPeerConnection);
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockSetMicrophoneEnabled.mockResolvedValue(undefined);
    mockSetCameraEnabled.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('buildRoomName prefixes session id', () => {
    expect(buildRoomName('abc')).toBe('proclaw-call-abc');
  });

  it('isLiveKitAvailable is true in jsdom', () => {
    expect(isLiveKitAvailable()).toBe(true);
  });

  it('fetchLiveKitToken returns payload from backend', async () => {
    mockPost.mockResolvedValue({
      token: 'jwt',
      url: 'wss://lk.example.com',
      roomName: 'proclaw-call-s1',
    });

    const result = await fetchLiveKitToken({
      roomName: 'proclaw-call-s1',
      participantIdentity: 'user-1',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/livekit/token', {
      roomName: 'proclaw-call-s1',
      participantIdentity: 'user-1',
      participantName: undefined,
    });
    expect(result).toEqual({
      token: 'jwt',
      url: 'wss://lk.example.com',
      roomName: 'proclaw-call-s1',
    });
  });

  it('fetchLiveKitToken returns null on incomplete response', async () => {
    mockPost.mockResolvedValue({ token: 'only' });
    expect(await fetchLiveKitToken({
      roomName: 'r1',
      participantIdentity: 'u1',
    })).toBeNull();
  });

  it('joinCallRoom connects room when token is available', async () => {
    mockPost.mockResolvedValue({
      token: 'jwt',
      url: 'wss://lk.example.com',
      roomName: 'proclaw-call-x',
    });

    const ok = await liveKitService.joinCallRoom({
      roomName: 'proclaw-call-x',
      participantIdentity: 'u1',
      callType: 'audio',
    });

    expect(ok).toBe(true);
    expect(mockConnect).toHaveBeenCalledWith('wss://lk.example.com', 'jwt');
    expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(mockSetCameraEnabled).toHaveBeenCalledWith(false);
  });
});