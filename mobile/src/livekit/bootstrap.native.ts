/**
 * LiveKit Phase 0: register WebRTC globals before any Room usage.
 */
import { registerGlobals } from '@livekit/react-native';

registerGlobals({ autoConfigureAudioSession: true });

export const LIVEKIT_BOOTSTRAPPED = true;