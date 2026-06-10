/**
 * LanSyncProvider - 局域网直连同步提供者
 * 通过 WebSocket 与桌面端直连，实现双向数据同步。
 *
 * 对应 PRD v11.0 第4节：局域网直连同步
 */

import type { ISyncProvider, SyncPackage, SyncResult, ConflictRecord } from './SyncEngine';
import type { IDatabase } from './DatabaseFactory';
import { getCurrentProfileId } from './DatabaseFactory';
import type { LanDevice } from './LanDiscoveryService';
import { getPendingChanges, markSynced } from './ChangeLogManager';
import { getDeviceId } from './SyncMetadataManager';
import { serializeChanges, deserializeChanges, applyRemoteChanges, ConflictResolver } from './SyncEngine';

/** 同步方向 */
export type SyncDirection = 'merge' | 'send_only' | 'receive_only';

/** 配对状态 */
export type PairingStatus = 'idle' | 'waiting_code' | 'pairing' | 'connected' | 'error';

/**
 * 局域网同步提供者
 */
export class LanSyncProvider implements ISyncProvider {
  readonly name = 'lan_sync';
  private ws: WebSocket | null = null;
  private db: IDatabase | null = null;
  private currentDevice: LanDevice | null = null;
  private pairingCode: string = '';
  private _pairingStatus: PairingStatus = 'idle';
  private onStatusChange: ((status: PairingStatus) => void) | null = null;
  private onProgress: ((current: number, total: number) => void) | null = null;
  // receive_only 异步等待机制
  // 审计 C4：使用队列支持并发 pull 请求
  private pendingPullQueue: Array<{
    resolve: (data: SyncPackage | null) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  // 审计 W20：push 确认等待队列（审计 C2：使用 Map 按 version 管理多个 pending ack，避免单槽覆盖）
  private pendingPushAcks: Map<number, {
    resolve: (success: boolean) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = new Map();
  private pushAckSeq = 0;

  get pairingStatus(): PairingStatus {
    return this._pairingStatus;
  }

  setStatusCallback(callback: (status: PairingStatus) => void): void {
    this.onStatusChange = callback;
  }

  setProgressCallback(callback: (current: number, total: number) => void): void {
    this.onProgress = callback;
  }

  /**
   * 设置配对状态并通知回调
   */
  private setPairingStatus(status: PairingStatus): void {
    this._pairingStatus = status;
    this.onStatusChange?.(status);
  }

  async isAvailable(): Promise<boolean> {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 连接到桌面端并配对联
   * @param device 目标设备
   * @param pairingCode 配对验证码
   * @param db 本地数据库
   */
  async connect(
    device: LanDevice,
    pairingCode: string,
    db: IDatabase
  ): Promise<boolean> {
    this.db = db;
    this.currentDevice = device;
    this.pairingCode = pairingCode;

    this.setPairingStatus('pairing');

    try {
      // 建立 WebSocket 连接
      // 审计 D6：局域网同步使用 ws://（无 TLS），仅在可信局域网中使用
      // 在公共 Wi-Fi 环境下配对码和同步数据可被窃听，需后续支持 wss://
      const wsUrl = `ws://${device.ip}:${device.port}/proclaw/sync`;

      return await new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          this.setPairingStatus('error');
          resolve(false);
        }, 5000);

        // 审计 C4：在 onopen 之前获取 deviceId，避免 async onopen 时序缺口
        let deviceIdCache: string = 'unknown';
        getDeviceId(db)
          .then((id) => { deviceIdCache = id ?? 'unknown'; })
          .catch(() => { deviceIdCache = 'unknown'; });

        ws.onopen = () => {
          clearTimeout(timeout);
          this.ws = ws;

          // 发送配对请求
          ws.send(JSON.stringify({
            type: 'pair',
            pairingCode: pairingCode,
            deviceId: deviceIdCache,
            deviceType: 'mobile',
          }));
        };

        ws.onmessage = (event) => {
          // 审计 I3：检查 this.ws 是否已设置，防止在 onopen 完成前收到消息
          if (!this.ws) {
            console.debug('[LanSync] Message received before WS ready, ignoring');
            return;
          }
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'pair_ack') {
              if (msg.success) {
                // 验证身份匹配 (PRD 6.4)
                const localProfileId = getCurrentProfileId();
                if (localProfileId && device.profileId && localProfileId !== device.profileId) {
                  console.warn(`[LanSync] Profile mismatch: local=${localProfileId}, remote=${device.profileId}`);
                  this.setPairingStatus('error');
                  ws.close();
                  resolve(false);
                  return;
                }
                this.setPairingStatus('connected');
                console.log('[LanSync] Paired with:', device.name);
                resolve(true);
              } else {
                this.setPairingStatus('error');
                resolve(false);
              }
            } else if (msg.type === 'sync_progress') {
              this.onProgress?.(msg.current, msg.total);
            } else if (msg.type === 'sync_data' && this.pendingPullQueue.length > 0) {
              // 接收远程变更数据（审计 C4：从队列中取最早的 pending 请求）
              const changes = msg.changes ? deserializeChanges(msg.changes) : [];
              const syncPkg: SyncPackage = {
                deviceId: msg.deviceId || '',
                profileId: device.profileId || '',
                timestamp: msg.timestamp || Date.now(),
                changes,
              };
              const pending = this.pendingPullQueue.shift()!;
              clearTimeout(pending.timer);
              pending.resolve(syncPkg);
            } else if (msg.type === 'sync_push_ack') {
              // 审计 W20/C2：收到 push 确认，按 seq 匹配，避免单槽覆盖
              const ackSeq = msg.seq;
              if (ackSeq !== undefined && this.pendingPushAcks.has(ackSeq)) {
                const pending = this.pendingPushAcks.get(ackSeq)!;
                this.pendingPushAcks.delete(ackSeq);
                clearTimeout(pending.timer);
                pending.resolve(msg.success !== false);
                console.log(`[LanSync] Push acknowledged by remote (seq=${ackSeq})`);
              } else {
                // 按旧协议兼容：查找任意 pending ack
                const firstEntry = this.pendingPushAcks.entries().next();
                if (!firstEntry.done) {
                  const [seq, pending] = firstEntry.value;
                  this.pendingPushAcks.delete(seq);
                  clearTimeout(pending.timer);
                  pending.resolve(msg.success !== false);
                  console.log(`[LanSync] Push acknowledged by remote (fallback seq=${seq})`);
                }
              }
            }
          } catch {
            // 非 JSON 消息，忽略
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          this.setPairingStatus('error');
          resolve(false);
        };

        ws.onclose = () => {
          this.setPairingStatus('idle');
          this.ws = null;
        };
      });
    } catch (error) {
      console.error('[LanSync] Connection failed:', error);
      this.setPairingStatus('error');
      return false;
    }
  }

  /**
   * 同步数据
   * @param direction 同步方向
   */
  async sync(direction: SyncDirection = 'merge'): Promise<SyncResult> {
    const result: SyncResult = { success: false, applied: 0, conflicts: 0, errors: [] };

    if (!this.db || !this.isAvailable()) {
      result.errors.push('Not connected');
      return result;
    }

    try {
      const db = this.db;
      const deviceIdValue = await getDeviceId(db).catch(() => null);
      const deviceId: string = deviceIdValue || 'unknown';

      if (direction === 'send_only' || direction === 'merge') {
        // 1. 获取本地待同步变更并发送
        const pendingChanges = await getPendingChanges(db);
        if (pendingChanges.length > 0) {
          const serialized = serializeChanges(pendingChanges);
          // 审计 C2：发送 seq 让远端 ack 时可匹配（不依赖隐式单槽）
          const pushSeq = this.pushAckSeq + 1;
          this.ws!.send(JSON.stringify({
            type: 'sync_push',
            seq: pushSeq,
            changes: serialized,
            deviceId,
            timestamp: Date.now(),
          }));

          // 审计 W20/C2：等待远端 sync_push_ack 确认后再标记 synced
          // 若未收到确认（服务器不支持 ack 或超时），则不标记 synced，下次重试
          const ackReceived = await this.waitForPushAck(10000);
          if (ackReceived) {
            await markSynced(db, pendingChanges.map(c => c.id));
            result.applied += pendingChanges.length;
            console.log(`[LanSync] Sent ${pendingChanges.length} changes (acknowledged)`);
          } else {
            console.warn(`[LanSync] Push ack not received, ${pendingChanges.length} changes will be retried on next sync`);
            result.errors.push('Push acknowledgment not received, changes will be retried');
            // 不标记 synced，让下次同步重新推送（服务器应幂等处理）
          }
        }
      }

      if (direction === 'receive_only' || direction === 'merge') {
        // 2. 请求远程变更并 await 响应
        const remotePkg = await this.pullRemoteChanges(deviceId);
        if (remotePkg && remotePkg.changes.length > 0) {
          // 3. 应用远程变更到本地
          const resolver = new ConflictResolver();
          const conflicts = await applyRemoteChanges(db, remotePkg.changes, resolver);
          result.applied += remotePkg.changes.length;
          result.conflicts = conflicts.length;
          console.log(`[LanSync] Received ${remotePkg.changes.length} changes, ${conflicts.length} conflicts`);
        }
      }

      result.success = true;
    } catch (error: any) {
      result.errors.push(error?.message || 'Sync failed');
      console.error('[LanSync] Sync failed:', error);
    }

    return result;
  }

  /**
   * 请求远程变更并等待响应（支持超时）
   * 审计 C4：使用队列支持并发请求
   */
  private pullRemoteChanges(deviceId: string, timeoutMs: number = 30000): Promise<SyncPackage | null> {
    return new Promise((resolve) => {
      // 设置超时
      const timer = setTimeout(() => {
        // 从队列中移除此请求
        const idx = this.pendingPullQueue.findIndex(p => p.resolve === resolve);
        if (idx >= 0) this.pendingPullQueue.splice(idx, 1);
        console.warn('[LanSync] Pull timeout');
        resolve(null);
      }, timeoutMs);

      this.pendingPullQueue.push({ resolve, timer });

      // 发送拉取请求
      this.ws!.send(JSON.stringify({
        type: 'sync_pull',
        deviceId,
        timestamp: Date.now(),
      }));
    });
  }

  /**
   * 等待远端 push 确认（审计 W20/C2：使用 Map + seq 支持多个并发 pendings）
   * @param timeoutMs 超时时间（毫秒）
   * @returns 是否收到确认
   */
  private waitForPushAck(timeoutMs: number = 10000): Promise<boolean> {
    const seq = ++this.pushAckSeq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingPushAcks.has(seq)) {
          this.pendingPushAcks.delete(seq);
        }
        console.warn(`[LanSync] Push ack timeout (seq=${seq})`);
        resolve(false);
      }, timeoutMs);

      this.pendingPushAcks.set(seq, { resolve, timer });
    });
  }

  /**
   * 实现 ISyncProvider 接口 - 上传
   */
  async upload(package_: SyncPackage): Promise<SyncResult> {
    return this.sync('send_only');
  }

  /**
   * 实现 ISyncProvider 接口 - 下载
   */
  async download(_sinceTimestamp: number, _deviceId: string): Promise<SyncPackage | null> {
    if (!this.db || !this.isAvailable()) return null;

    try {
      const db = this.db;
      const deviceId = (await getDeviceId(db)) || 'unknown';
      const pendingChanges = await getPendingChanges(db);

      return {
        deviceId,
        profileId: '',
        timestamp: Date.now(),
        changes: pendingChanges,
      };
    } catch {
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // 审计 W20/C2：断开时清理所有 pending push ack
    for (const [, pending] of this.pendingPushAcks) {
      clearTimeout(pending.timer);
      pending.resolve(false);
    }
    this.pendingPushAcks.clear();
    // 审计 W22：断开时清理 pending pull 队列，避免调用方挂起直到超时
    for (const pending of this.pendingPullQueue) {
      clearTimeout(pending.timer);
      pending.resolve(null);
    }
    this.pendingPullQueue = [];
    this.currentDevice = null;
    this.db = null;
    this.setPairingStatus('idle');
    console.log('[LanSync] Disconnected');
  }
}

// 全局单例
export const lanSyncProvider = new LanSyncProvider();
export default LanSyncProvider;
