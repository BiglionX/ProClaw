# ProClaw Mobile AV Calls - LiveKit Integration Plan (PRD v4.1 Revision)

> Created: 2026-06-23
> Status: Phase 4 complete (2026-06-23); auth clarified — **no demo account/data on mobile**
> Related PRD: docs/prd/mobile/ProClaw 手机端音视频通话功能需求（补充 v4.1）.md

## 1. Technology Decision

| Option | Verdict | Rationale |
|--------|---------|-----------|
| Wildfire IM AV SDK | Rejected | RN 0.85 conflicts; extra IM server |
| react-native-webrtc | Rejected | Removed v20 (startup crashes) |
| LiveKit React Native SDK | Recommended | Official RN, SFU, Expo dev client |
| Self-hosted SFU + WS | Fallback | High ops cost for v1.x |

Architecture: ProClaw WebSocket for call invite/busy/hangup; LiveKit for media rooms and TURN.

## 2. MVP Scope (4-6 weeks)

- 1:1 audio and video
- Foreground IncomingCallModal
- SQLite call_records table
- Desktop interoperability (LiveKit client on Tauri/Web)

## 3. Architecture

Mobile CallManager -- call_offer/answer/hangup --> ProClaw WebSocket
        |
        | POST /api/livekit/token
        v
@livekit/react-native -- WebRTC --> LiveKit Server (SFU)

## 4. Signaling Changes

Add roomName and livekitUrl to call_offer payload. Do not send SDP/ICE over WebSocket.

## 5. Mobile Phases

Phase 0 (1d): Expo Dev Client, install @livekit/react-native + expo plugin, permissions — **DONE 2026-06-23**
Phase 1 (2-3d): LiveKitService.ts, token API client, replace WebRTC.native stub — **DONE 2026-06-23**
Phase 2 (3-4d): Refactor CallManager (WS + Room.connect), remove RTCPeerConnection — **DONE 2026-06-23** (mobile native)
Phase 3 (2d): Restore ContactsTab/ProfileTab/ChatDetail call UI; LiveKit VideoView in CallScreen — **DONE 2026-06-23**
Phase 4 (3-5d): Desktop LiveKit client + WS/CallManager wiring — **DONE 2026-06-23** (Schema v5 / E2E optional)

## 9. Authentication & connectivity (no demo path; desktop pairing optional)

Mobile is a **standalone app**: first launch → Onboarding (create profile) → **Main** — **no** mandatory `ConnectionScreen`.

Desktop pairing is **optional**, for sync / AV calls / API-backed features when a Tauri host is available. User configures it from **Settings → 配对桌面端** (or **局域网同步**), not at first open.

**Removed / not allowed:** demo accounts, `demo_*` tokens, injected fake contacts/products/call records.

### 9.1 Mobile — default (offline / standalone)

| Step | Action |
|------|--------|
| 1 | First launch: `Onboarding` → create profile → `Main` (`App.tsx` `initializeApp`) |
| 2 | Local SQLite + AI Team / chat / plugins work without desktop |
| 3 | `callConnectionService.connectIfPaired()` on startup only if tokens already saved (no-op otherwise) |

### 9.2 Mobile — optional desktop pairing (Settings)

| Step | Action |
|------|--------|
| 1 | User opens **Settings → 配对桌面端** → `ConnectionScreen` (QR or 6-digit code from desktop User Center) |
| 2 | `POST /api/auth/pair` → persist `access_token`, `refresh_token`, `serverUrl` |
| 3 | `GET /api/auth/me` → `user.id` |
| 4 | `WebSocketService.connect` + `CallManager` handlers |
| 5 | AV calls use LiveKit token API with paired JWT |

**Removed / not allowed:** `setDemoMode`, “跳过登录体验演示”, boss/demo login for mobile.

### 9.2 Desktop (Tauri host)

| Step | Action |
|------|--------|
| 1 | Axum server runs on `:8888` with `LIVEKIT_*` env configured |
| 2 | Local UI obtains session via **`get_ws_session_cmd`** (JWT for current internal SQLite user — **not** Supabase mock / boss login) |
| 3 | `WebSocketService.connect(localhost:8888, userId, token)` + `CallManager.init()` |
| 4 | User Center generates pairing codes for mobile devices (`created_by` = desktop user id) |

**Removed / not allowed:** Mapping `boss@proclaw.demo` or mock Supabase session to `/api/auth/login` for call wiring.

### 9.3 Interop checklist

- [ ] Both sides connected to **same** Tauri backend
- [ ] Caller/callee use **backend `users.id`** (contacts table), not mock ids
- [ ] `call_offer` includes `roomName`; both join same LiveKit room after answer
- [ ] LiveKit env vars set on server host

### 9.4 Signaling payload (LiveKit path)

`call_offer`: `{ sessionId, callType, callerId, calleeId, roomName }` — no SDP/ICE  
`call_answer`: `{ sessionId, joined: true }` — callee already in room; caller joins on receipt

## 6. Backend

- POST /api/livekit/token (livekit-server-sdk JWT)
- WS call_* routing to all user devices
- Env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

## 7. Acceptance

- 1:1 audio >= 60s on Android/iOS Dev Client
- Video mute/camera/hangup works
- CallHistoryScreen from DB
- npm test and npm run lint:check pass

## 8. Code Index

- WebSocketService.ts, CallManager.ts, CallStore.ts, CallScreen.tsx, IncomingCallModal.tsx
- New: LiveKitService.ts, src/livekit/bootstrap.native.ts

## Phase 0 deliverables (2026-06-23)

| Item | Path / action |
|------|----------------|
| Dependencies | `expo-dev-client`, `@livekit/react-native`, `@livekit/react-native-expo-plugin`, `@livekit/react-native-webrtc`, `@config-plugins/react-native-webrtc`, `livekit-client` |
| Config plugins | `app.json` plugins array |
| Bootstrap | `index.ts` → `src/livekit/bootstrap(.native).ts` calls `registerGlobals()` |
| Service skeleton | `src/services/LiveKitService.ts` — token fetch + Room connect/disconnect |
| Metro | `metro.config.js` `unstable_conditionNames` for single LiveKit instance |
| Dev build | `eas.json` already has `developmentClient: true`; run `npx expo run:android` or EAS development profile |
| Backend (Phase 1) | `POST /api/livekit/token` in `src-tauri/src/api/livekit.rs` |

## Phase 4 deliverables — desktop (2026-06-23)

| Item | Path / action |
|------|----------------|
| Dependency | `livekit-client` in root `package.json` |
| LiveKit service | `src/services/LiveKitService.ts` — browser `Room`, token via `apiClient` |
| Call manager | `src/services/CallManager.ts` — LiveKit-only; `roomName` signaling (no SDP/ICE) |
| Connection wiring | `src/services/callConnectionService.ts` + `AppLayout.tsx` — **`get_ws_session_cmd`**, WS, `CallManager.init()` |
| Call UI | `src/pages/CallPage.tsx` — `onStreamChange` stream binding |
| Tests | `src/services/LiveKitService.test.ts` |

## Phase 4 mobile follow-up (2026-06-23)

| Item | Path / action |
|------|----------------|
| Call connectivity | `mobile/src/services/callConnectionService.ts` — connect WS only when paired JWT exists |
| Remove demo path | Delete `setDemoMode` / `isDemoMode`; remove demo UI entry |
| Remove demo data | Contacts/Products/Inventory/CallHistory/CloudStore — real API or empty state only |
| Wire pairing | Settings → `ConnectionScreen`; on success + `App.tsx` resume → `connectIfPaired()` |