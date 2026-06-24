// Desktop LiveKit AV service (PRD v4.1 Phase 4)
import {
  ConnectionState,
  Room,
  RoomEvent,
  type RemoteTrack,
} from 'livekit-client';
import apiClient from '../lib/apiClient';

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

export function isLiveKitAvailable(): boolean {
  return typeof window !== 'undefined' && typeof RTCPeerConnection === 'function';
}

export function buildRoomName(sessionId: string): string {
  return `proclaw-call-${sessionId}`;
}

export async function fetchLiveKitToken(
  request: LiveKitTokenRequest,
): Promise<LiveKitTokenResponse | null> {
  try {
    const data = await apiClient.post<LiveKitTokenResponse>('/api/livekit/token', {
      roomName: request.roomName,
      participantIdentity: request.participantIdentity,
      participantName: request.participantName,
    });
    if (!data?.token || !data?.url) return null;
    return {
      token: data.token,
      url: data.url,
      roomName: data.roomName ?? request.roomName,
    };
  } catch {
    return null;
  }
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
    onLocalStream?: (stream: MediaStream | null) => void;
    onRemoteStream?: (stream: MediaStream | null) => void;
  }): void {
    this.onRemoteStream = callbacks.onRemoteStream ?? null;
    this.onLocalStream = callbacks.onLocalStream ?? null;
  }

  private attachRoomListeners(room: Room): void {
    const refreshRemote = () => this.refreshRemoteStream(room);
    const refreshLocal = () => this.refreshLocalPreview(room);

    room.on(RoomEvent.TrackSubscribed, (_track: RemoteTrack) => {
      refreshRemote();
    });
    room.on(RoomEvent.TrackUnsubscribed, () => refreshRemote());
    room.on(RoomEvent.ParticipantDisconnected, () => refreshRemote());
    room.on(RoomEvent.LocalTrackPublished, () => refreshLocal());
    room.on(RoomEvent.LocalTrackUnpublished, () => refreshLocal());
    room.on(RoomEvent.Disconnected, () => {
      this.onRemoteStream?.(null);
      this.onLocalStream?.(null);
    });
  }

  private refreshRemoteStream(room: Room): void {
    const stream = new MediaStream();
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        const mediaTrack = pub.track?.mediaStreamTrack;
        if (pub.isSubscribed && mediaTrack) {
          stream.addTrack(mediaTrack);
        }
      });
    });
    this.onRemoteStream?.(stream.getTracks().length > 0 ? stream : null);
  }

  private refreshLocalPreview(room: Room): void {
    const tracks: MediaStreamTrack[] = [];
    room.localParticipant.trackPublications.forEach((pub) => {
      const mediaTrack = pub.track?.mediaStreamTrack;
      if (mediaTrack) tracks.push(mediaTrack);
    });
    if (tracks.length === 0) {
      this.onLocalStream?.(null);
      return;
    }
    this.onLocalStream?.(new MediaStream(tracks));
  }

  async joinCallRoom(opts: {
    roomName: string;
    participantIdentity: string;
    participantName?: string;
    callType: 'audio' | 'video';
  }): Promise<boolean> {
    if (!isLiveKitAvailable()) return false;

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
      this.refreshLocalPreview(room);
      return true;
    } catch (e) {
      console.error('[LiveKit] joinCallRoom failed:', e);
      this.room = null;
      return false;
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    await this.room?.localParticipant.setMicrophoneEnabled(enabled);
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    await this.room?.localParticipant.setCameraEnabled(enabled);
    if (this.room) this.refreshLocalPreview(this.room);
  }

  async disconnect(): Promise<void> {
    if (!this.room) return;
    try {
      await this.room.disconnect();
    } catch (e) {
      console.warn('[LiveKit] disconnect error:', e);
    } finally {
      this.room = null;
      this.onRemoteStream?.(null);
      this.onLocalStream?.(null);
    }
  }
}

export const liveKitService = new LiveKitService();
export default liveKitService;