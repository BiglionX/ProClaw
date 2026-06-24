/**
 * LiveKit AV service (PRD v4.1 Phase 1)
 */
import { Platform } from 'react-native';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
} from 'livekit-client';
import { MediaStream } from '@livekit/react-native-webrtc';
import { getApiClient } from './AuthService';
import { LIVEKIT_BOOTSTRAPPED } from '../livekit/bootstrap';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';
import type { CallType } from '../stores/CallStore';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

export interface LiveKitTokenRequest {
  roomName: string;
  participantIdentity: string;
  participantName?: string;
}

export function isLiveKitNativeAvailable(): boolean {
  return Platform.OS !== 'web' && LIVEKIT_BOOTSTRAPPED;
}

export function buildRoomName(sessionId: string): string {
  return `proclaw-call-${sessionId}`;
}

export async function fetchLiveKitToken(
  request: LiveKitTokenRequest,
): Promise<LiveKitTokenResponse | null> {
  try {
    const client = await getApiClient();
    const { data } = await client.post<LiveKitTokenResponse>('/api/livekit/token', {
      roomName: request.roomName,
      participantIdentity: request.participantIdentity,
      participantName: request.participantName,
    });
    if (!data?.token || !data?.url) {
      logger.warn('[LiveKit] Token response missing token or url');
      return null;
    }
    return {
      token: data.token,
      url: data.url,
      roomName: data.roomName ?? request.roomName,
    };
  } catch (e) {
    logger.warn('[LiveKit] Token fetch failed:', getErrorMessage(e));
    return null;
  }
}

function trackToMediaStream(track: RemoteTrack): MediaStream | null {
  const mediaTrack = track.mediaStreamTrack;
  if (!mediaTrack) return null;
  const stream = new MediaStream();
  stream.addTrack(mediaTrack as never);
  return stream;
}

class LiveKitService {
  private room: Room | null = null;
  private onRemoteStream: ((stream: MediaStream | null) => void) | null = null;
  private onLocalStream: ((stream: MediaStream | null) => void) | null = null;

  get activeRoom(): Room | null {
    return this.room;
  }

  get connectionState(): ConnectionState {
    return this.room?.state ?? ConnectionState.Disconnected;
  }

  setStreamCallbacks(callbacks: {
    onRemoteStream?: (stream: MediaStream | null) => void;
    onLocalStream?: (stream: MediaStream | null) => void;
  }): void {
    this.onRemoteStream = callbacks.onRemoteStream ?? null;
    this.onLocalStream = callbacks.onLocalStream ?? null;
  }

  private attachRoomListeners(room: Room): void {
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant: RemoteParticipant) => {
      if (participant.isLocal) return;
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const stream = trackToMediaStream(track as RemoteTrack);
        if (stream) this.onRemoteStream?.(stream);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant: RemoteParticipant) => {
      if (participant.isLocal) return;
      if (track.kind === Track.Kind.Video) {
        this.onRemoteStream?.(null);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      this.onRemoteStream?.(null);
      this.onLocalStream?.(null);
    });
  }

  private async refreshLocalPreview(room: Room, callType: CallType): Promise<void> {
    const pubs = room.localParticipant.videoTrackPublications;
    const videoPub = Array.from(pubs.values()).find((p) => p.track);
    const videoTrack = videoPub?.track?.mediaStreamTrack;
    if (callType === 'video' && videoTrack) {
      const stream = new MediaStream();
      stream.addTrack(videoTrack as never);
      this.onLocalStream?.(stream);
    } else {
      this.onLocalStream?.(null);
    }
  }

  async joinCallRoom(opts: {
    roomName: string;
    participantIdentity: string;
    participantName?: string;
    callType: CallType;
  }): Promise<boolean> {
    if (!isLiveKitNativeAvailable()) {
      logger.warn('[LiveKit] Native SDK not bootstrapped');
      return false;
    }

    const tokenResponse = await fetchLiveKitToken({
      roomName: opts.roomName,
      participantIdentity: opts.participantIdentity,
      participantName: opts.participantName,
    });
    if (!tokenResponse) return false;

    await this.disconnect();
    const room = new Room();
    this.room = room;
    this.attachRoomListeners(room);

    try {
      await room.connect(tokenResponse.url, tokenResponse.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(opts.callType === 'video');
      await this.refreshLocalPreview(room, opts.callType);
      logger.log('[LiveKit] Joined room', opts.roomName);
      return true;
    } catch (e) {
      logger.error('[LiveKit] joinCallRoom failed:', getErrorMessage(e));
      this.room = null;
      return false;
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    await this.room?.localParticipant.setMicrophoneEnabled(enabled);
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    const room = this.room;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(enabled);
    const callType: CallType = enabled ? 'video' : 'audio';
    await this.refreshLocalPreview(room, callType);
  }

  async disconnect(): Promise<void> {
    if (!this.room) return;
    try {
      await this.room.disconnect();
    } catch (e) {
      logger.warn('[LiveKit] disconnect error:', getErrorMessage(e));
    } finally {
      this.room = null;
      this.onRemoteStream?.(null);
      this.onLocalStream?.(null);
    }
  }
}

export const liveKitService = new LiveKitService();