# ProClaw 手机端音视频通话功能需求（补充 v4.1）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | 🔵 部分实现 v1.0+ (2026-06-08, 进度 ~20%) |
| **首次落地版本** | v1.0.0 (2026-06-08)（仅基础设施预留） |
| **关联发布** | `RELEASE_NOTES_v1.0.0.md` 未提及；`mobile-audit-report-v14.md` 未涉及 |
| **覆盖率** | ~20%（CallManager 接口与 WebRTC 初始调试代码存在；野火 IM SDK 未引入） |
| **代码入口** | `mobile/src/services/CallManager.ts`（信令/媒体控制占位）、`mobile/src/screens/CallScreen.tsx`（UI 框架） |
| **数据库依赖** | N/A（通话记录未来可存储于 `chat_sessions`） |
| **测试覆盖** | 暂无专用 E2E |
| **差异与遗留** | 桌面端与移动端间实时音视频通话尚未落地；野火 IM SDK 依赖与体积问题需重新评估；`mobile-audit-report-v14.md` 中 react-native-webrtc 存在兼容性警告 |
| **后续动作** | 进入 v1.x 路线图；需决策选型（野火 IM / LiveKit / 自建 WebSocket+WebRTC） |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | 🔵 部分实现 ~20% | v1.0.0 发布，基础设施预留但实际通话链路未启用 |
| 2026-06-16 | 🔵 部分实现 ~20% | 文档整理：添加实施状态区块；列为 v1.x 路线图项 |

---

## 1. 概述

在现有 ProClaw 移动端（React Native）基础上，集成野火 IM 音视频 SDK（免费版），实现与桌面端、手机端之间的实时语音通话和视频通话功能。信令复用自研 WebSocket，不依赖野火 IM 服务器。

## 2. 技术选型

| 组件               | 技术方案                                                     |
| ------------------ | ------------------------------------------------------------ |
| 音视频引擎         | 野火 IM 音视频 SDK（免费版），包含 WebRTC 实现               |
| 信令传输           | 复用现有自研 WebSocket（消息类型扩展）                       |
| 推送通知           | 社区版：仅前台及后台短时提醒；Pro 版：FCM/APNs + Supabase 中继 |
| 前端框架           | React Native（0.72+），使用官方野火 RN 插件（或原生桥接）    |

## 3. 手机端功能需求

### 3.1 发起通话
- **入口**：单聊界面右上角 / 输入栏上方增加“语音通话”和“视频通话”图标。
- **前置检查**：
  - 对方是否在线（通过 WebSocket 状态判断，不在线则提示无法接通）。
  - 自身麦克风/摄像头权限（未授权时弹出系统授权框）。
- **流程**：
  1. 生成唯一 sessionId。
  2. 调用野火 SDK 的 `startCall` 方法，传入对方 ID、通话类型。
  3. SDK 回调返回 SDP offer → 通过 WebSocket 发送 `call_offer` 消息。
  4. 进入等待接听界面（显示“正在呼叫...”）。
  5. 对方应答后进入通话界面；若对方拒绝/超时（30秒），结束并提示。

### 3.2 接听通话
- **触发**：收到 WebSocket 的 `call_offer` 消息。
- **来电展示**：
  - **前台**：弹出模态框（全屏或底部弹窗），显示来电者头像、昵称、通话类型，提供“接听”和“拒绝”按钮。
  - **后台（Pro版）**：通过推送通知（FCM/APNs）唤醒 App，点击通知后直接显示来电界面；若 App 被 Kill，则记录未接来电（下次打开时提示）。
- **流程**：
  1. 用户点击“接听” → 调用野火 SDK 的 `acceptCall`，生成 SDP answer 并通过 WebSocket 发送 `call_answer`。
  2. 双方交换 ICE 候选（通过 WebSocket 的 `call_ice_candidate` 消息）。
  3. 建立 WebRTC 连接，进入通话界面。

### 3.3 通话界面
- **组件选择**：优先使用野火 SDK 自带的原生通话界面（功能完整，开发成本低）。如需统一 UI 风格，可自定义 React Native 组件并使用 `react-native-webrtc`。
- **界面元素**（若自定义）：
  - 对方视频画面（大窗口）
  - 本地摄像头预览（小窗口，可拖拽）
  - 通话时长计时器（实时更新）
  - 控制栏：静音、关闭摄像头（视频通话）、切换前后摄像头（视频）、扬声器、挂断
- **交互**：
  - 点击挂断 → 调用 SDK 的 `endCall`，发送 `call_hangup`，关闭界面。
  - 对方挂断 → 收到 `call_hangup` 后自动关闭界面并提示“对方已挂断”。

### 3.4 通话记录
- **本地存储**：通话记录统一由桌面端 SQLite 存储（`call_records` 表），手机端可通过 API 查询。
- **展示**：
  - 在聊天详情页（点击右上角“...”）增加“通话记录”列表，展示与该联系人的历史通话（时间、时长、类型、是否接听）。
  - 在 App 主菜单（侧边栏）增加“通话记录”全局入口。

### 3.5 多端同时在线处理
- **来电广播**：桌面端维护每个用户的在线设备列表（已有 devices 表），收到 `call_offer` 时向所有在线设备推送。
- **接听优先级**：任一端接听后，其他设备收到 `call_hangup`（由接听方触发），自动取消来电并显示“已在其他设备接听”。

## 4. 信令与自研 WebSocket 集成

### 4.1 WebSocket 消息类型扩展

在现有 WebSocket 服务中增加以下消息类型（与桌面端一致）：

| 类型                    | 方向     | payload 内容                                                |
| ----------------------- | -------- | ----------------------------------------------------------- |
| `call_offer`            | 主叫→被叫 | `{ sessionId, offer: { sdp, type }, callType: 'audio'/'video', callerId, calleeId }` |
| `call_answer`           | 被叫→主叫 | `{ sessionId, answer: { sdp, type } }`                      |
| `call_ice_candidate`    | 双方     | `{ sessionId, candidate: { candidate, sdpMid, sdpMLineIndex } }` |
| `call_hangup`           | 任一方   | `{ sessionId }`                                             |
| `call_reject`           | 被叫→主叫 | `{ sessionId }`                                             |
| `call_busy`             | 被叫→主叫 | `{ sessionId }`（通话中拒绝）                               |

### 4.2 野火 SDK 与 WebSocket 桥接

```typescript
// 注册 SDK 信令发送回调
WildfireAVEngineKit.onSendOffer = (sessionId, offer) => {
  ws.send(JSON.stringify({ type: 'call_offer', payload: { sessionId, offer } }));
};

WildfireAVEngineKit.onSendAnswer = (sessionId, answer) => {
  ws.send(JSON.stringify({ type: 'call_answer', payload: { sessionId, answer } }));
};

WildfireAVEngineKit.onSendIceCandidate = (sessionId, candidate) => {
  ws.send(JSON.stringify({ type: 'call_ice_candidate', payload: { sessionId, candidate } }));
};

// WebSocket 接收到信令时，调用 SDK 对应方法
case 'call_offer':
  WildfireAVEngineKit.onReceiveOffer(payload.sessionId, payload.offer);
  break;
case 'call_answer':
  WildfireAVEngineKit.onReceiveAnswer(payload.sessionId, payload.answer);
  break;
case 'call_ice_candidate':
  WildfireAVEngineKit.onReceiveIceCandidate(payload.sessionId, payload.candidate);
  break;
case 'call_hangup':
  WildfireAVEngineKit.onReceiveHangup(payload.sessionId);
  break;
```

## 5. 推送通知（Pro 版）

### 5.1 场景
当 App 处于后台或被 Kill 时，通过推送通知唤醒并提示来电。

### 5.2 实现流程
1. 桌面端收到 `call_offer`，若目标用户的移动端 WebSocket 不在线，则调用 Supabase Edge Function 发送推送通知。
2. Edge Function 使用 FCM/APNs 向目标设备发送高优先级通知（含 `sessionId`、`callerId`、`callType`）。
3. 移动端收到推送后，解析数据，弹出本地通知并启动 `IncomingCallActivity`（原生层），或通过 `react-native-push-notification` 打开 App 并跳转到接听界面。
4. 用户点击通知 → App 打开 → 自动调用 `acceptCall` 逻辑。

### 5.3 注意事项
- **iOS VoIP 推送**：若需要被 Kill 后仍能接听，需集成 PushKit（苹果审核较严，小商户场景可暂缓）。初期仅实现 App 在后台时通知（存活约30秒）。
- **推送证书**：需配置 Firebase Cloud Messaging 和 Apple Push Notification 证书。

## 6. 权限与隐私

- **运行时权限**：使用 `react-native-permissions` 在首次发起通话前申请麦克风、摄像头权限。拒绝时提示无法使用对应功能。
- **通话记录访问**：仅存储在桌面端，手机端通过 API 查询，不本地持久化敏感记录（可缓存加密）。

## 7. UI/UX 设计要点

| 界面         | 设计说明                                                     |
| ------------ | ------------------------------------------------------------ |
| **来电弹窗** | 使用 Modal 或全屏透明 Activity，显示来电者信息、接听/拒绝按钮，伴有振动和铃声（可配置）。 |
| **通话中界面** | 若使用野火 SDK 自带界面，直接展示；若自定义，确保控制按钮易操作（大尺寸，避免误触），支持屏幕旋转。 |
| **通话记录列表** | 按时间倒序排列，显示联系人、通话类型（语音/视频）、方向（呼入/呼出）、时长、状态（已接/未接/已取消）。 |

## 8. 与现有代码的集成检查点

- [ ] `package.json` 添加野火 RN 插件依赖（或原生桥接模块）。
- [ ] `WebSocketService.ts` 增加信令消息处理。
- [ ] 聊天界面组件增加通话按钮，绑定 `startCall` 逻辑。
- [ ] 新增 `CallManager.ts` 模块，管理 SDK 初始化和全局通话状态。
- [ ] 新增 `IncomingCallModal.tsx` 组件。
- [ ] 新增 `CallHistoryScreen.tsx` 组件（聊天详情页）。
- [ ] 更新 Redux/Zustand 状态（通话中、通话结束等）。

## 9. 测试用例

| 场景                                 | 预期结果                                                     |
| ------------------------------------ | ------------------------------------------------------------ |
| 手机 ↔ 手机，同一 WiFi               | 正常建立音视频通话，画质流畅                                 |
| 手机 ↔ 手机，不同网络（WiFi ↔ 4G）   | 信令正常，媒体流可能走 TURN（延迟略高），但能连通            |
| 手机 ↔ 桌面端                        | 互通正常，信令通过同一 WebSocket 交换                        |
| 发起通话时对方离线                   | 提示“对方不在线”或“无法接通”，不发送 offer                   |
| 通话中切换网络（WiFi 断开）          | WebRTC 自动重连，短暂卡顿后恢复；若超时30秒无媒体流则自动挂断 |
| App 在后台收到来电（Pro 版）         | 弹出推送通知，点击后打开 App 并显示来电界面                   |
| 多端同时在线（手机+电脑）同时来电    | 所有设备振铃，一端接听后其余设备停止振铃并提示               |
| 权限拒绝                             | 发起通话时提示“请授予麦克风/摄像头权限”，无法发起             |

## 10. 开发排期（1.5 周）

| 天数  | 任务                                                         |
| ----- | ------------------------------------------------------------ |
| 1-2   | 集成野火 RN 插件，调通 SDK 初始化、权限申请、基本回调         |
| 3-4   | 实现 WebSocket 信令扩展与 SDK 桥接，完成发起/接听流程         |
| 5-6   | 实现通话界面（使用 SDK 自带 UI 或自定义），测试端到端连通性   |
| 7-8   | 实现通话记录展示、多端在线处理、网络切换容错                 |
| 9-10  | 推送通知集成（Pro 版），全面测试并修复 Bug                    |

---

**文档结束**