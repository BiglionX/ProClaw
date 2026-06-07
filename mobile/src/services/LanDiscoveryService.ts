/**
 * LanDiscoveryService - 局域网设备发现服务
 * 扫描同网络下的 ProClaw 桌面端。
 *
 * 对应 PRD v11.0 第4.2节
 */

import { getLocalIPAddress } from './ConnectionManager';

export interface LanDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  profileId: string;
  deviceType: 'desktop' | 'mobile';
  lastSeen: number;
}

const DEFAULT_PORT = 8889;

/**
 * 探测单个设备是否运行 ProClaw 同步服务
 */
async function probeDevice(ip: string, port: number): Promise<LanDevice | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://${ip}:${port}/proclaw/sync/info`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return {
      id: data.device_id || `lan_${ip.replace(/\./g, '_')}`,
      name: data.device_name || `桌面端 (${ip})`,
      ip,
      port: data.port || port,
      profileId: data.profile_id || '',
      deviceType: data.device_type || 'desktop',
      lastSeen: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * 生成扫描目标 IP 列表
 * 审计 E4：动态检测子网掩码。C 段 /24 扫描 1-254，
 * 更大子网（如 /16）扫描常见段的高频 IP 避免超时。
 */
function generateScanTargets(subnet: string, excludeIp?: string | null): string[] {
  const targets: string[] = [];
  // 检测子网类型：若 subnet 以数字结尾含 '.'（C段格式如 "192.168.1."）扫描全段
  // 若 subnet 不含最后一组（如 "10.0." 大子网），仅扫描常见 IP
  const isFullCSegment = /^\d+\.\d+\.\d+\.$/.test(subnet);
  if (isFullCSegment) {
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}${i}`;
      if (ip !== excludeIp) {
        targets.push(ip);
      }
    }
  } else {
    // 大子网：扫描常见高频 IP（网关 + 常见服务器段）
    const commonLasts = [1, 2, 10, 20, 50, 100, 101, 102, 110, 150, 200, 254];
    for (const last of commonLasts) {
      const ip = `${subnet}.${last}`;
      if (ip !== excludeIp) {
        targets.push(ip);
      }
    }
  }
  return targets;
}

/**
 * 扫描局域网内的可用设备（支持进度回调）
 * @param knownServers 已知服务器列表
 * @param onProgress 扫描进度回调 (current, total)
 * @param batchSize 每批并发扫描数（默认20）
 */
export const scanLanDevices = async (
  knownServers: string[] = [],
  onProgress?: (current: number, total: number) => void,
  batchSize: number = 20
): Promise<LanDevice[]> => {
  const devices: LanDevice[] = [];

  try {
    const localIp = await getLocalIPAddress();
    const subnet = localIp ? localIp.substring(0, localIp.lastIndexOf('.') + 1) : '';

    // 尝试已知服务器地址
    for (const server of knownServers) {
      try {
        const device = await probeDevice(server, DEFAULT_PORT);
        if (device) {
          devices.push(device);
        }
      } catch {
        // 忽略无法连接的已知服务器
      }
    }

    // 分批扫描子网
    if (subnet) {
      const allTargets = generateScanTargets(subnet, localIp);
      const total = allTargets.length;
      let scanned = 0;

      for (let i = 0; i < allTargets.length; i += batchSize) {
        const batch = allTargets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(ip => probeDevice(ip, DEFAULT_PORT).catch(() => null))
        );

        for (const device of batchResults) {
          if (device && !devices.find(d => d.ip === device.ip)) {
            devices.push(device);
          }
        }

        scanned += batch.length;
        onProgress?.(scanned, total);
      }
    }

    console.log(`[LanDiscovery] Found ${devices.length} devices`);
  } catch (error) {
    console.warn('[LanDiscovery] Scan failed:', error);
  }

  return devices;
};

/**
 * 获取设备显示名称
 */
export const getDeviceDisplayName = (device: LanDevice): string => {
  return `${device.name} (${device.ip}:${device.port})`;
};

export default {
  scanLanDevices,
  getDeviceDisplayName,
};
