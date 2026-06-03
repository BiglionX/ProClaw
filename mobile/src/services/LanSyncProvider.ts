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
  private pendingPullResolve: ((data: SyncPackage | null) => void) | null = null;
  private pendingPullTimer: ReturnType<typeof setTimeout> | null = null;

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
      const wsUrl = `ws://${device.ip}:${device.port}/proclaw/sync`;

      return await new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          this.setPairingStatus('error');
          resolve(false);
        }, 5000);

        ws.onopen = async () => {
          clearTimeout(timeout);
          this.ws = ws;

          // 发送配对请求
          ws.send(JSON.stringify({
            type: 'pair',
            pairingCode: pairingCode,
            deviceId: await getDeviceId(db).catch(() => 'unknown'),
            deviceType: 'mobile',
          }));
        };

        ws.onmessage = (event) => {
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
            } else if (msg.type === 'sync_data' && this.pendingPullResolve) {
              // 接收远程变更数据
              const changes = msg.changes ? deserializeChanges(msg.changes) : [];
              const syncPkg: SyncPackage = {
                deviceId: msg.deviceId || '',
                profileId: device.profileId || '',
                timestamp: msg.timestamp || Date.now(),
                changes,
              };
              this.pendingPullResolve(syncPkg);
              this.pendingPullResolve = null;
              if (this.pendingPullTimer) {
                clearTimeout(this.pendingPullTimer);
                this.pendingPullTimer = null;
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
          this.ws!.send(JSON.stringify({
            type: 'sync_push',
            changes: serialized,
            deviceId,
            timestamp: Date.now(),
          }));

          // 等待确认后标记
          await markSynced(db, pendingChanges.map(c => c.id));
          result.applied += pendingChanges.length;
          console.log(`[LanSync] Sent ${pendingChanges.length} changes`);
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
   */
  private pullRemoteChanges(deviceId: string, timeoutMs: number = 30000): Promise<SyncPackage | null> {
    return new Promise((resolve) => {
      // 设置超时
      this.pendingPullTimer = setTimeout(() => {
        this.pendingPullResolve = null;
        console.warn('[LanSync] Pull timeout');
        resolve(null);
      }, timeoutMs);

      this.pendingPullResolve = resolve;

      // 发送拉取请求
      this.ws!.send(JSON.stringify({
        type: 'sync_pull',
        deviceId,
        timestamp: Date.now(),
      }));
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
    this.currentDevice = null;
    this.db = null;
    this.setPairingStatus('idle');
    console.log('[LanSync] Disconnected');
  }
}

// 全局单例
export const lanSyncProvider = new LanSyncProvider();
export default LanSyncProvider;
