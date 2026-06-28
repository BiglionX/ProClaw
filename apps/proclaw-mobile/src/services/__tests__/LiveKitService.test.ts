/// <reference types="jest" />

jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../livekit/bootstrap', () => ({
  LIVEKIT_BOOTSTRAPPED: false,
}));

jest.mock('@livekit/react-native-webrtc', () => ({
  MediaStream: jest.fn().mockImplementation(() => ({
    addTrack: jest.fn(),
  })),
}));

const mockPost = jest.fn();
jest.mock('../AuthService', () => ({
  getApiClient: jest.fn(async () => ({ post: mockPost })),
}));

import {
  buildRoomName,
  fetchLiveKitToken,
  isLiveKitNativeAvailable,
  liveKitService,
} from '../LiveKitService';
import { ConnectionState } from 'livekit-client';

describe('LiveKitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildRoomName', () => {
    it('prefixes session id with proclaw-call', () => {
      expect(buildRoomName('abc-123')).toBe('proclaw-call-abc-123');
    });
  });

  describe('isLiveKitNativeAvailable', () => {
    it('returns false when bootstrap did not run (jest/web)', () => {
      expect(isLiveKitNativeAvailable()).toBe(false);
    });
  });

  describe('fetchLiveKitToken', () => {
    it('returns token payload from backend', async () => {
      mockPost.mockResolvedValue({
        data: {
          token: 'jwt-token',
          url: 'wss://livekit.example.com',
          roomName: 'proclaw-call-s1',
        },
      });

      const result = await fetchLiveKitToken({
        roomName: 'proclaw-call-s1',
        participantIdentity: 'user-1',
        participantName: 'Alice',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/livekit/token', {
        roomName: 'proclaw-call-s1',
        participantIdentity: 'user-1',
        participantName: 'Alice',
      });
      expect(result).toEqual({
        token: 'jwt-token',
        url: 'wss://livekit.example.com',
        roomName: 'proclaw-call-s1',
      });
    });

    it('returns null when response is incomplete', async () => {
      mockPost.mockResolvedValue({ data: { token: 'only-token' } });
      expect(await fetchLiveKitToken({
        roomName: 'r1',
        participantIdentity: 'u1',
      })).toBeNull();
    });

    it('returns null on network error', async () => {
      mockPost.mockRejectedValue(new Error('404'));
      expect(await fetchLiveKitToken({
        roomName: 'r1',
        participantIdentity: 'u1',
      })).toBeNull();
    });
  });

  describe('liveKitService', () => {
    it('starts disconnected', () => {
      expect(liveKitService.connectionState).toBe(ConnectionState.Disconnected);
      expect(liveKitService.activeRoom).toBeNull();
    });

    it('joinCallRoom returns false without native bootstrap', async () => {
      const ok = await liveKitService.joinCallRoom({
        roomName: 'proclaw-call-x',
        participantIdentity: 'u1',
        callType: 'audio',
      });
      expect(ok).toBe(false);
    });
  });
});